#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token, Address, Env, String, Vec};

const DAY_IN_LEDGERS: u32 = 17280; // ~24h
const LEDGER_TTL_THRESHOLD: u32 = DAY_IN_LEDGERS * 30;
const LEDGER_TTL_EXTEND: u32 = DAY_IN_LEDGERS * 365;

const FORFEIT_BPS: u32 = 100; // 1% on early withdrawal
const BPS_DENOMINATOR: i128 = 10_000;

// ── Types ────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TargetGoal {
    pub id: u64,
    pub user: Address,
    pub name: String,
    pub target_amount: i128,
    pub period_seconds: u64,
    pub period_amount: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub deposited: i128,
    pub last_deposit_date: u64,
    pub missed_periods: u32,
    pub is_complete: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Keeper,
    UsdcToken,
    FeeRecipient,
    GoalCounter,
    Goal(u64),
    UserGoals(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    AdminNotSet = 2,
    GoalNotFound = 10,
    GoalAlreadyComplete = 11,
    InvalidAmount = 12,
    InvalidDuration = 13,
    InvalidPeriod = 14,
    PeriodNotDue = 15,
    InsufficientUserBalance = 16,
    InsufficientUserAllowance = 17,
    NotGoalOwner = 18,
}

// ── Contract ─────────────────────────────────────────────────────────

#[contract]
pub struct TargetSavings;

#[contractimpl]
impl TargetSavings {
    // ── Constructor ──
    pub fn __constructor(env: Env, admin: Address, usdc_token: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::FeeRecipient, &admin);
        env.storage().instance().set(&DataKey::Keeper, &admin); // admin is keeper by default
        env.storage().instance().set(&DataKey::GoalCounter, &0u64);
    }

    // ── Admin / config ──

    pub fn admin(env: Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Admin).ok_or(Error::AdminNotSet)
    }

    pub fn set_keeper(env: Env, keeper: Address) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Keeper, &keeper);
        Ok(())
    }

    pub fn keeper(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Keeper).unwrap()
    }

    pub fn set_fee_recipient(env: Env, recipient: Address) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::FeeRecipient, &recipient);
        Ok(())
    }

    pub fn fee_recipient(env: Env) -> Address {
        env.storage().instance().get(&DataKey::FeeRecipient).unwrap()
    }

    pub fn usdc_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::UsdcToken).unwrap()
    }

    // ── User-facing ──

    /// Create a new target savings goal. The user must have approved the contract
    /// to spend USDC up to `target_amount` on the USDC token contract.
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
            last_deposit_date: now, // first period starts now (next due in `period_seconds`)
            missed_periods: 0,
            is_complete: false,
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

        env.events().publish((symbol_short!("created"), user), id);
        Ok(id)
    }

    /// Manually deposit additional funds into a goal (top-up).
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

        goal.deposited += amount;
        env.storage().persistent().set(&DataKey::Goal(target_id), &goal);
        Self::extend_ttl(&env, &DataKey::Goal(target_id));

        env.events().publish((symbol_short!("manualdep"), user), (target_id, amount));
        Ok(())
    }

    /// Withdraw entire goal balance. Charges 1% forfeit if before `end_date`.
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
        let total = goal.deposited;

        let (to_user, forfeit) = if now < goal.end_date {
            let f = total * (FORFEIT_BPS as i128) / BPS_DENOMINATOR;
            (total - f, f)
        } else {
            (total, 0)
        };

        if to_user > 0 {
            token.transfer(&env.current_contract_address(), &user, &to_user);
        }
        if forfeit > 0 {
            let recipient = Self::fee_recipient(env.clone());
            token.transfer(&env.current_contract_address(), &recipient, &forfeit);
        }

        goal.deposited = 0;
        goal.is_complete = true;
        env.storage().persistent().set(&DataKey::Goal(target_id), &goal);
        Self::extend_ttl(&env, &DataKey::Goal(target_id));

        env.events().publish((symbol_short!("withdraw"), user), (target_id, to_user, forfeit));
        Ok(to_user)
    }

    // ── Keeper-facing ──

    /// Process a single period for a goal: pulls `period_amount` from the user's wallet
    /// via `transfer_from`. If the user lacks balance/allowance, logs a missed period.
    /// Callable only by the keeper (admin can be set as keeper).
    pub fn process_period(env: Env, target_id: u64) -> Result<(), Error> {
        let keeper = Self::keeper(env.clone());
        keeper.require_auth();

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
            env.events().publish((symbol_short!("missed"), goal.user.clone()), target_id);
            return Ok(());
        }

        // Pull funds via transfer_from
        token.transfer_from(
            &env.current_contract_address(),
            &goal.user,
            &env.current_contract_address(),
            &goal.period_amount,
        );

        goal.deposited += goal.period_amount;
        goal.last_deposit_date = next_due;

        // Auto-complete if target met
        if goal.deposited >= goal.target_amount && now >= goal.end_date {
            // Don't auto-withdraw, just keep open until user calls withdraw
        }

        env.storage().persistent().set(&DataKey::Goal(target_id), &goal);
        Self::extend_ttl(&env, &DataKey::Goal(target_id));
        env.events().publish((symbol_short!("deposit"), goal.user.clone()), (target_id, goal.period_amount));
        Ok(())
    }

    // ── Reads ──

    pub fn get_target(env: Env, target_id: u64) -> Result<TargetGoal, Error> {
        env.storage().persistent().get(&DataKey::Goal(target_id)).ok_or(Error::GoalNotFound)
    }

    pub fn get_user_goals(env: Env, user: Address) -> Vec<u64> {
        env.storage().persistent()
            .get(&DataKey::UserGoals(user))
            .unwrap_or_else(|| Vec::new(&env))
    }

    // ── Blend integration stubs ──

    pub fn deposit_to_blend(env: Env, amount: i128) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        env.events().publish((symbol_short!("blendDep"),), amount);
        Ok(())
    }

    pub fn withdraw_from_blend(env: Env, amount: i128) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        env.events().publish((symbol_short!("blendWd"),), amount);
        Ok(())
    }

    pub fn blend_position(_env: Env) -> i128 {
        0
    }

    // ── Internal helpers ──

    fn next_id(env: &Env) -> u64 {
        let counter: u64 = env.storage().instance().get(&DataKey::GoalCounter).unwrap_or(0);
        let next = counter + 1;
        env.storage().instance().set(&DataKey::GoalCounter, &next);
        next
    }

    fn token_client(env: &Env) -> token::TokenClient {
        let token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        token::TokenClient::new(env, &token)
    }

    fn extend_ttl(env: &Env, key: &DataKey) {
        env.storage().persistent().extend_ttl(key, LEDGER_TTL_THRESHOLD, LEDGER_TTL_EXTEND);
    }
}

#[cfg(test)]
mod test;
