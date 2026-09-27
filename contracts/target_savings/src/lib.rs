#![no_std]

mod error;
mod events;
mod types;

use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};
use soroban_sdk::{
    contract, contractclient, contractimpl, panic_with_error, symbol_short, token, vec, Address,
    Env, IntoVal, String, Vec,
};
use stellar_access::access_control::{self as access_control, AccessControl, AccessControlError};
use stellar_macros::{default_impl, only_role, when_not_paused};
use stellar_contract_utils::pausable::{self as pausable, Pausable};

use error::Error;
use types::{DataKey, TargetGoal};

// ── Pool interface ───────────────────────────────────────────────────
// Minimal client for the (mock) Blend pool this contract supplies idle USDC to.
// Matches mock_pool's surface; swapping in real Blend later only changes the
// bodies below, not this contract's public API.
#[contractclient(name = "PoolClient")]
pub trait Pool {
    fn supply(env: Env, from: Address, amount: i128);
    fn withdraw(env: Env, from: Address, amount: i128) -> i128;
    fn get_position(env: Env, supplier: Address) -> i128;
}

const DAY_IN_LEDGERS: u32 = 17280; // ~24h
const LEDGER_TTL_THRESHOLD: u32 = DAY_IN_LEDGERS * 30;
const LEDGER_TTL_EXTEND: u32 = DAY_IN_LEDGERS * 365;

const FORFEIT_BPS: u32 = 100; // 1% on early withdrawal
const BPS_DENOMINATOR: i128 = 10_000;
const SECONDS_PER_YEAR: i128 = 31_536_000;
const DEFAULT_YIELD_APY_BPS: u32 = 1000; // 10%, matches the mock pool

// ── Contract ─────────────────────────────────────────────────────────

#[contract]
pub struct TargetSavings;

#[contractimpl]
impl TargetSavings {
    // ── Constructor ──

    /// `admin` is the cold, offline address controlling config, role grants and
    /// pause. `fee_recipient` is a distinct address that only receives the early
    /// withdrawal fee: it defaults to *nothing* (`None`), never to `admin`.
    pub fn __constructor(
        env: Env,
        admin: Address,
        fee_recipient: Option<Address>,
        usdc_token: Address,
    ) {
        admin.require_auth();
        access_control::set_admin(&env, &admin);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::GoalCounter, &0u64);
        if let Some(recipient) = fee_recipient {
            env.storage().instance().set(&DataKey::FeeRecipient, &recipient);
        }
    }

    // ── Admin ──
    //
    // Admin functions compare the explicit `caller` against the address stored by
    // `set_admin` (so two-step transfer is respected) *and* require its auth, so a
    // keeper key is rejected even when the host would accept a signature.

    // Set (or update) the Blend pool address. Admin-only; set after deploy so the
    // pool can be swapped (mock -> real Blend) without redeploying this contract.
    pub fn set_pool(env: Env, caller: Address, pool: Address) -> Result<(), Error> {
        Self::require_admin(&env, &caller);
        env.storage().instance().set(&DataKey::Pool, &pool);
        Ok(())
    }

    pub fn pool(env: Env) -> Result<Address, Error> {
        Self::pool_addr(&env)
    }

    // Set or clear the fee recipient. Admin-only. Clearing leaves the contract
    // with no fee recipient (it never falls back to the admin).
    pub fn set_fee_recipient(
        env: Env,
        caller: Address,
        recipient: Option<Address>,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &caller);
        match recipient {
            Some(recipient) => env.storage().instance().set(&DataKey::FeeRecipient, &recipient),
            None => env.storage().instance().remove(&DataKey::FeeRecipient),
        }
        Ok(())
    }

    pub fn fee_recipient(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::FeeRecipient)
    }

    pub fn usdc_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::UsdcToken).unwrap()
    }

    // APY (bps) used to accrue per-goal interest. Should match the pool's APY so
    // the pool can cover payouts; admin-settable for that reason.
    pub fn set_yield_apy(env: Env, caller: Address, apy_bps: u32) -> Result<(), Error> {
        Self::require_admin(&env, &caller);
        env.storage().instance().set(&DataKey::YieldApyBps, &apy_bps);
        Ok(())
    }

    pub fn yield_apy_bps(env: Env) -> u32 {
        Self::yield_apy(&env)
    }

    // ── Keeper ──
    //
    // The only scheduled function: pull the next period from a goal's wallet. The
    // caller must hold the `keeper` role.

    /// Process a single period for a goal: pulls `period_amount` from the user's wallet
    /// via `transfer_from`. If the user lacks balance/allowance, logs a missed period.
    #[only_role(caller, "keeper")]
    pub fn process_period(env: Env, caller: Address, target_id: u64) -> Result<(), Error> {
        let mut goal = Self::get_target(env.clone(), target_id)?;
        if goal.is_complete {
            return Err(Error::GoalAlreadyComplete);
        }

        let now = env.ledger().timestamp();
        let next_due = goal.last_deposit_date + goal.period_seconds;
        if now < next_due {
            return Err(Error::PeriodNotDue);
        }

        let token = Self::token_client(&env);
        let user_balance = token.balance(&goal.user);
        let allowance = token.allowance(&goal.user, &env.current_contract_address());

        if user_balance < goal.period_amount || allowance < goal.period_amount {
            // Skip + log
            goal.missed_periods += 1;
            goal.last_deposit_date = next_due;
            env.storage().persistent().set(&DataKey::Goal(target_id), &goal);
            Self::extend_ttl(&env, &DataKey::Goal(target_id));
            events::Missed { target_id, user: goal.user.clone() }.publish(&env);
            return Ok(());
        }

        // Pull funds via transfer_from
        token.transfer_from(
            &env.current_contract_address(),
            &goal.user,
            &env.current_contract_address(),
            &goal.period_amount,
        );

        // Lock in interest on the existing balance before it grows.
        Self::settle_goal_yield(&env, &mut goal, now);
        goal.deposited += goal.period_amount;
        goal.last_deposit_date = next_due;

        // Auto-complete if target met
        if goal.deposited >= goal.target_amount && now >= goal.end_date {
            // Don't auto-withdraw, just keep open until user calls withdraw
        }

        env.storage().persistent().set(&DataKey::Goal(target_id), &goal);
        Self::extend_ttl(&env, &DataKey::Goal(target_id));
        events::PeriodDeposit { target_id, user: goal.user.clone(), amount: goal.period_amount }
            .publish(&env);
        Ok(())
    }

    // ── User functions ──

    // Create a new target savings goal. The user must have approved the contract
    // to spend USDC up to `target_amount` on the USDC token contract.
    #[when_not_paused]
    pub fn create_target(
        env: Env,
        user: Address,
        name: String,
        target_amount: i128,
        period_seconds: u64,
        period_amount: i128,
        end_date: u64,
    ) -> Result<u64, Error> {
        user.require_auth();
        if target_amount <= 0 || period_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let now = env.ledger().timestamp();
        if end_date <= now {
            return Err(Error::InvalidDuration);
        }
        // Period must be at least 1 day, at most goal duration
        let goal_seconds = end_date - now;
        if period_seconds < 86_400 || period_seconds > goal_seconds {
            return Err(Error::InvalidPeriod);
        }

        let id = Self::next_id(&env);
        let goal = TargetGoal {
            id,
            user: user.clone(),
            name,
            target_amount,
            period_seconds,
            period_amount,
            start_date: now,
            end_date,
            deposited: 0,
            last_deposit_date: now,
            missed_periods: 0,
            is_complete: false,
            accrued_yield: 0,
            last_yield_update: now,
        };

        env.storage().persistent().set(&DataKey::Goal(id), &goal);
        Self::extend_ttl(&env, &DataKey::Goal(id));

        // Add to user index
        let mut user_goals: Vec<u64> = env.storage().persistent()
            .get(&DataKey::UserGoals(user.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        user_goals.push_back(id);
        env.storage().persistent().set(&DataKey::UserGoals(user.clone()), &user_goals);
        Self::extend_ttl(&env, &DataKey::UserGoals(user.clone()));

        events::TargetCreated { target_id: id, user }.publish(&env);
        Ok(id)
    }

    // Manually deposit additional funds into a goal.
    #[when_not_paused]
    pub fn manual_deposit(env: Env, user: Address, target_id: u64, amount: i128) -> Result<(), Error> {
        user.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let mut goal = Self::get_target(env.clone(), target_id)?;
        if goal.user != user {
            return Err(Error::NotGoalOwner);
        }
        if goal.is_complete {
            return Err(Error::GoalAlreadyComplete);
        }

        let token = Self::token_client(&env);
        token.transfer(&user, &env.current_contract_address(), &amount);

        // Lock in interest on the existing balance before it grows.
        Self::settle_goal_yield(&env, &mut goal, env.ledger().timestamp());
        goal.deposited += amount;
        env.storage().persistent().set(&DataKey::Goal(target_id), &goal);
        Self::extend_ttl(&env, &DataKey::Goal(target_id));

        events::ManualDeposit { target_id, user, amount }.publish(&env);
        Ok(())
    }

    /// Withdraw entire goal balance. Charges 1% forfeit if before `end_date`.
    #[when_not_paused]
    pub fn withdraw(env: Env, user: Address, target_id: u64) -> Result<i128, Error> {
        user.require_auth();
        let mut goal = Self::get_target(env.clone(), target_id)?;
        if goal.user != user {
            return Err(Error::NotGoalOwner);
        }
        if goal.is_complete {
            return Err(Error::GoalAlreadyComplete);
        }

        let now = env.ledger().timestamp();
        let token = Self::token_client(&env);

        // Settle interest up to now, then make sure the contract holds principal +
        // yield, pulling any shortfall from the pool (capped so it can't trap).
        Self::settle_goal_yield(&env, &mut goal, now);
        let principal = goal.deposited;
        let needed = principal + goal.accrued_yield;
        let available = Self::ensure_idle(&env, &token, needed);
        // Pay all the yield the contract can actually cover; principal always fits.
        let payable_yield = available - principal;

        // 1% forfeit on principal for early withdrawal; yield is never forfeited.
        let forfeit = if now < goal.end_date {
            principal * (FORFEIT_BPS as i128) / BPS_DENOMINATOR
        } else {
            0
        };
        let to_user = principal - forfeit + payable_yield;

        if to_user > 0 {
            token.transfer(&env.current_contract_address(), &user, &to_user);
        }
        if forfeit > 0 {
            // Only pays out when a fee recipient was configured; it never falls
            // back to the admin, so with no recipient configured the fee stays in
            // the vault.
            if let Some(recipient) = Self::fee_recipient(env.clone()) {
                token.transfer(&env.current_contract_address(), &recipient, &forfeit);
            }
        }

        goal.deposited = 0;
        goal.accrued_yield = 0;
        goal.is_complete = true;
        env.storage().persistent().set(&DataKey::Goal(target_id), &goal);
        Self::extend_ttl(&env, &DataKey::Goal(target_id));

        events::Withdrawn { target_id, user, to_user, forfeit }.publish(&env);
        Ok(to_user)
    }

    // ── Reads ──
    // These stay callable while the contract is paused.

    pub fn get_target(env: Env, target_id: u64) -> Result<TargetGoal, Error> {
        env.storage().persistent().get(&DataKey::Goal(target_id)).ok_or(Error::GoalNotFound)
    }

    pub fn get_user_goals(env: Env, user: Address) -> Vec<u64> {
        env.storage().persistent()
            .get(&DataKey::UserGoals(user))
            .unwrap_or_else(|| Vec::new(&env))
    }

    // This goal's interest earned so far, rolled forward to *now*. This is the
    // exact number to show on the goal (paid on top of principal at withdrawal).
    pub fn get_goal_yield(env: Env, target_id: u64) -> Result<i128, Error> {
        let mut goal = Self::get_target(env.clone(), target_id)?;
        Self::settle_goal_yield(&env, &mut goal, env.ledger().timestamp());
        Ok(goal.accrued_yield)
    }

    // ── Blend integration ──
    // Keeper-driven: move idle USDC into the pool to earn yield while goals fill,
    // pull it back on demand, and read the contract's aggregate pool position.
    // Each goal accrues its own interest (see settle_goal_yield / get_goal_yield);
    // the pool holds the funds backing those payouts.

    #[only_role(caller, "keeper")]
    pub fn deposit_to_blend(env: Env, caller: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let pool = Self::pool_addr(&env)?;
        let token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let self_addr = env.current_contract_address();

        // pool.supply makes a nested token.transfer(self -> pool) that needs this
        // contract's auth from inside the pool call; pre-authorize exactly that.
        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: token.clone(),
                    fn_name: symbol_short!("transfer"),
                    args: (self_addr.clone(), pool.clone(), amount).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);

        PoolClient::new(&env, &pool).supply(&self_addr, &amount);
        events::BlendDeposit { amount }.publish(&env);
        Ok(())
    }

    #[only_role(caller, "keeper")]
    pub fn withdraw_from_blend(env: Env, caller: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let pool = Self::pool_addr(&env)?;
        PoolClient::new(&env, &pool).withdraw(&env.current_contract_address(), &amount);
        events::BlendWithdraw { amount }.publish(&env);
        Ok(())
    }

    pub fn blend_position(env: Env) -> i128 {
        match Self::pool_addr(&env) {
            Ok(pool) => {
                PoolClient::new(&env, &pool).get_position(&env.current_contract_address())
            }
            Err(_) => 0,
        }
    }

    // ── Internal helpers ──

    // Admin identity check: the explicit caller must be the address set by
    // `set_admin` (so two-step admin transfer is automatically respected) and must
    // also authenticate.
    fn require_admin(env: &Env, caller: &Address) {
        let admin = access_control::get_admin(env)
            .unwrap_or_else(|| panic_with_error!(env, AccessControlError::AdminNotSet));
        if *caller != admin {
            panic_with_error!(env, AccessControlError::Unauthorized);
        }
        caller.require_auth();
    }

    fn pool_addr(env: &Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Pool).ok_or(Error::PoolNotSet)
    }

    fn yield_apy(env: &Env) -> u32 {
        env.storage().instance().get(&DataKey::YieldApyBps).unwrap_or(DEFAULT_YIELD_APY_BPS)
    }

    // Roll a goal's accrued interest forward to `now` (in memory). Must be called
    // before any change to `deposited` so each period earns at its own balance.
    fn settle_goal_yield(env: &Env, goal: &mut TargetGoal, now: u64) {
        if goal.last_yield_update == 0 {
            goal.last_yield_update = now;
            return;
        }
        if now > goal.last_yield_update && goal.deposited > 0 {
            let apy = Self::yield_apy(env) as i128;
            let elapsed = (now - goal.last_yield_update) as i128;
            goal.accrued_yield +=
                goal.deposited * apy * elapsed / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
        }
        goal.last_yield_update = now;
    }

    // Ensure the contract holds at least `target` USDC, pulling the shortfall from
    // the pool (capped at the pool position so it can never trap). Returns the
    // amount actually available (== `target`, or less if the pool can't cover it).
    fn ensure_idle(env: &Env, token: &token::TokenClient, target: i128) -> i128 {
        let self_addr = env.current_contract_address();
        let idle = token.balance(&self_addr);
        if idle >= target {
            return target;
        }
        let pulled = match Self::pool_addr(env) {
            Ok(pool) => {
                let pc = PoolClient::new(env, &pool);
                let position = pc.get_position(&self_addr);
                let shortfall = target - idle;
                let pull = if shortfall <= position { shortfall } else { position };
                if pull > 0 {
                    pc.withdraw(&self_addr, &pull);
                }
                pull
            }
            Err(_) => 0,
        };
        let available = idle + pulled;
        if available < target {
            available
        } else {
            target
        }
    }

    fn next_id(env: &Env) -> u64 {
        let counter: u64 = env.storage().instance().get(&DataKey::GoalCounter).unwrap_or(0);
        let next = counter + 1;
        env.storage().instance().set(&DataKey::GoalCounter, &next);
        next
    }

    fn token_client(env: &Env) -> token::TokenClient<'_> {
        let token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        token::TokenClient::new(env, &token)
    }

    fn extend_ttl(env: &Env, key: &DataKey) {
        env.storage().persistent().extend_ttl(key, LEDGER_TTL_THRESHOLD, LEDGER_TTL_EXTEND);
    }
}

// OZ `Pausable`: admin-only emergency stop. Reads stay callable while paused and
// `pause`/`unpause` are never pause-guarded.
#[contractimpl]
impl Pausable for TargetSavings {
    fn paused(e: &Env) -> bool {
        pausable::paused(e)
    }

    fn pause(e: &Env, caller: Address) {
        Self::require_admin(e, &caller);
        pausable::pause(e);
    }

    fn unpause(e: &Env, caller: Address) {
        Self::require_admin(e, &caller);
        pausable::unpause(e);
    }
}

// OZ `AccessControl` (roles, role grants, two-step admin transfer).
#[default_impl]
#[contractimpl]
impl AccessControl for TargetSavings {}

#[cfg(test)]
mod test;
