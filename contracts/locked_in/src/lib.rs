#![no_std]

mod error;
mod events;
mod test;
mod types;

use loktin_yield::{assets_for_shares, shares_for_deposit, PoolClient};
use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};
use soroban_sdk::{
    contract, contractimpl, symbol_short, token, vec, Address, Env, IntoVal, Map, Vec,
};

use error::Error;
use types::{DataKey, Lock};

const DAY_IN_LEDGERS: u32 = 17_280;
const LEDGER_TTL_THRESHOLD: u32 = DAY_IN_LEDGERS * 30;
const LEDGER_TTL_EXTEND: u32 = DAY_IN_LEDGERS * 365;

// One month is exactly one twelfth of the 365-day year, so a 12-month lock runs
// the full 365 days and its advertised APY is earned in full. With a flat 30-day
// month a "12 month" lock ran only 360 days and paid 360/365 of the advertised
// rate (9.86% for a "10% APY" tier). Resolving it here keeps `duration_seconds`
// and `projected_yield` self-consistent with `SECONDS_PER_YEAR`.
const SECONDS_PER_MONTH: u64 = 2_628_000; // 365 / 12 days
const SECONDS_PER_YEAR: i128 = 31_536_000; // 365 days
const BPS_DENOMINATOR: i128 = 10_000;

// The pool interface (`PoolClient`) and the share math now come from the shared
// `loktin-yield` crate so every yielding contract prices shares the same way.

// ── Contract ─────────────────────────────────────────────────────────

#[contract]
pub struct LockedIn;

#[contractimpl]
impl LockedIn {
    pub fn __constructor(env: Env, admin: Address, usdc_token: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::LockCounter, &0u64);
        env.storage().instance().set(&DataKey::TotalShares, &0i128);

        // Default APY tiers: 1mo=4%, 3mo=6%, 6mo=8%, 12mo=10%
        let mut tiers: Map<u32, u32> = Map::new(&env);
        tiers.set(1, 400);
        tiers.set(3, 600);
        tiers.set(6, 800);
        tiers.set(12, 1000);
        env.storage().instance().set(&DataKey::ApyTiers, &tiers);

        Self::extend_ttl_instance(&env);
    }

    // ── Admin ──

    pub fn admin(env: Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Admin).ok_or(Error::AdminNotSet)
    }

    pub fn set_apy_tier(env: Env, duration_months: u32, apy_basis_points: u32) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        let mut tiers: Map<u32, u32> = env.storage().instance().get(&DataKey::ApyTiers).unwrap();
        tiers.set(duration_months, apy_basis_points);
        env.storage().instance().set(&DataKey::ApyTiers, &tiers);
        Self::extend_ttl_instance(&env);
        events::ApyTierSet { duration_months, apy_basis_points }.publish(&env);
        Ok(())
    }

    pub fn get_apy_tiers(env: Env) -> Map<u32, u32> {
        env.storage().instance().get(&DataKey::ApyTiers).unwrap()
    }

    pub fn get_apy_for_duration(env: Env, duration_months: u32) -> Result<u32, Error> {
        let tiers: Map<u32, u32> = env.storage().instance().get(&DataKey::ApyTiers).unwrap();
        tiers.get(duration_months).ok_or(Error::DurationTierMissing)
    }

    pub fn usdc_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::UsdcToken).unwrap()
    }

    // Set (or update) the Blend pool address. Admin-only; set after deploy so the
    // pool and this contract can be deployed in any order, and so the pool can be
    // swapped (mock -> real Blend) without redeploying this contract.
    pub fn set_pool(env: Env, pool: Address) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Pool, &pool);
        Self::extend_ttl_instance(&env);
        Ok(())
    }

    pub fn pool(env: Env) -> Result<Address, Error> {
        Self::pool_addr(&env)
    }

    // ── for users ──

    // Lock USDC for a fixed duration. Returns the lock id (1-indexed).
    //
    // The lock records `shares` of the pooled vault. The maturity payout is
    // whatever those shares redeem for at that time; `projected_yield` is a
    // display estimate only and is never paid as a promise.
    pub fn lock(env: Env, user: Address, amount: i128, duration_months: u32) -> Result<u64, Error> {
        user.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        // Range check BEFORE the tier lookup. The tier map only holds 1/3/6/12,
        // so looking it up first made every out-of-range duration fail with
        // `DurationTierMissing` and left `InvalidDuration` unreachable.
        if duration_months == 0 || duration_months > 60 {
            return Err(Error::InvalidDuration);
        }
        let apy_bps = Self::get_apy_for_duration(env.clone(), duration_months)?;

        // Price the deposit against what the vault owns *before* it lands, so an
        // existing depositor's accrued yield is not diluted by the newcomer.
        let total_shares = Self::load_total_shares(&env);
        let total_assets = Self::vault_assets(&env);
        let shares = shares_for_deposit(amount, total_shares, total_assets);
        // A zero-share mint would take the user's money and give them no claim.
        if shares <= 0 {
            return Err(Error::ZeroShares);
        }

        let token = Self::token_client(&env);
        token.transfer(&user, &env.current_contract_address(), &amount);

        let now = env.ledger().timestamp();
        let duration_seconds = (duration_months as u64) * SECONDS_PER_MONTH;
        let end_date = now + duration_seconds;
        // projected_yield = amount * apy_bps / 10000 * duration_seconds / SECONDS_PER_YEAR
        // Display estimate only — the payout is driven by `shares`.
        let projected_yield = amount * (apy_bps as i128) / BPS_DENOMINATOR
            * (duration_seconds as i128)
            / SECONDS_PER_YEAR;

        let id = Self::next_id(&env);
        let lock = Lock {
            id,
            user: user.clone(),
            amount,
            shares,
            apy_basis_points: apy_bps,
            duration_seconds,
            start_date: now,
            end_date,
            projected_yield,
            is_unlocked: false,
        };

        env.storage().persistent().set(&DataKey::Lock(id), &lock);
        Self::extend_ttl(&env, &DataKey::Lock(id));

        let mut user_locks: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        user_locks.push_back(id);
        env.storage().persistent().set(&DataKey::UserLocks(user.clone()), &user_locks);
        Self::extend_ttl(&env, &DataKey::UserLocks(user.clone()));

        env.storage().instance().set(&DataKey::TotalShares, &(total_shares + shares));
        Self::extend_ttl_instance(&env);

        events::Locked { lock_id: id, user, amount, shares, projected_yield }.publish(&env);
        Ok(id)
    }

    // Unlock a matured lock and pay out what its shares redeem for.
    //
    // The payout comes from the vault's *current* value, so it includes only
    // yield the pool actually earned. Idle USDC that would leave the contract
    // short is pulled from the pool first; if the vault genuinely cannot cover
    // it the call fails instead of paying a phantom figure out of another user's
    // principal.
    pub fn unlock(env: Env, user: Address, lock_id: u64) -> Result<i128, Error> {
        user.require_auth();
        let mut lock = Self::get_lock(env.clone(), lock_id)?;
        if lock.user != user {
            return Err(Error::NotLockOwner);
        }
        if lock.is_unlocked {
            return Err(Error::LockAlreadyUnlocked);
        }
        let now = env.ledger().timestamp();
        if now < lock.end_date {
            return Err(Error::LockNotMatured);
        }

        let token = Self::token_client(&env);
        let self_addr = env.current_contract_address();

        let total_shares = Self::load_total_shares(&env);
        let payout = assets_for_shares(lock.shares, total_shares, Self::vault_assets(&env));

        // Cover the payout with idle USDC, pulling the shortfall back from the
        // pool (capped at the pool position so this can never over-withdraw).
        let idle = token.balance(&self_addr);
        if idle < payout {
            if let Ok(pool) = Self::pool_addr(&env) {
                let pc = PoolClient::new(&env, &pool);
                let position = pc.get_position(&self_addr);
                let shortfall = payout - idle;
                let pull = if shortfall <= position { shortfall } else { position };
                if pull > 0 {
                    pc.withdraw(&self_addr, &pull);
                }
            }
        }
        if token.balance(&self_addr) < payout {
            return Err(Error::InsufficientLiquidity);
        }
        token.transfer(&self_addr, &user, &payout);

        lock.is_unlocked = true;
        env.storage().persistent().set(&DataKey::Lock(lock_id), &lock);
        Self::extend_ttl(&env, &DataKey::Lock(lock_id));

        env.storage().instance().set(&DataKey::TotalShares, &(total_shares - lock.shares));
        Self::extend_ttl_instance(&env);

        events::Unlocked { lock_id, user, payout }.publish(&env);
        Ok(payout)
    }

    // Read functions

    pub fn get_lock(env: Env, lock_id: u64) -> Result<Lock, Error> {
        env.storage().persistent().get(&DataKey::Lock(lock_id)).ok_or(Error::LockNotFound)
    }

    pub fn get_user_locks(env: Env, user: Address) -> Vec<u64> {
        env.storage().persistent().get(&DataKey::UserLocks(user)).unwrap_or_else(|| Vec::new(&env))
    }

    // Total shares outstanding across every live lock.
    pub fn total_shares(env: Env) -> i128 {
        Self::load_total_shares(&env)
    }

    // Everything the vault owns right now: idle USDC plus the pool position.
    // This is the denominator the shares are priced against.
    pub fn total_assets(env: Env) -> i128 {
        Self::vault_assets(&env)
    }

    // ── Blend integration ──
    // Keeper-driven: move idle USDC into the pool to earn yield, pull it back on
    // demand, and read the contract's aggregate pool position.

    // Supply `amount` of idle USDC from this contract into the pool.
    pub fn deposit_to_blend(env: Env, amount: i128) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let pool = Self::pool_addr(&env)?;
        let token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let self_addr = env.current_contract_address();

        // `pool.supply` makes a nested `token.transfer(self -> pool)` that requires
        // this contract's auth from inside the pool call. Pre-authorize exactly that
        // sub-invocation as the current contract.
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

    // Withdraw `amount` of USDC from the pool back into this contract.
    pub fn withdraw_from_blend(env: Env, amount: i128) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let pool = Self::pool_addr(&env)?;
        // The pool is the direct caller of the token on the way out, so no
        // authorize_as_current_contract is needed here.
        PoolClient::new(&env, &pool).withdraw(&env.current_contract_address(), &amount);
        events::BlendWithdraw { amount }.publish(&env);
        Ok(())
    }

    // This contract's current pool position (principal + accrued yield). 0 if unset.
    pub fn blend_position(env: Env) -> i128 {
        Self::pool_position(&env)
    }

    // Internal functions

    fn pool_addr(env: &Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Pool).ok_or(Error::PoolNotSet)
    }

    fn pool_position(env: &Env) -> i128 {
        match Self::pool_addr(env) {
            Ok(pool) => PoolClient::new(env, &pool).get_position(&env.current_contract_address()),
            Err(_) => 0,
        }
    }

    fn vault_assets(env: &Env) -> i128 {
        let idle = Self::token_client(env).balance(&env.current_contract_address());
        idle + Self::pool_position(env)
    }

    fn load_total_shares(env: &Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalShares).unwrap_or(0)
    }

    // IDs start at 1 (never 0) so an unset counter is distinguishable from a real
    // id. Mirrors `loktin_common::next_id`, which will replace this once the
    // shared crate lands.
    fn next_id(env: &Env) -> u64 {
        let counter: u64 = env.storage().instance().get(&DataKey::LockCounter).unwrap_or(0);
        let next = counter + 1;
        env.storage().instance().set(&DataKey::LockCounter, &next);
        next
    }

    fn token_client(env: &Env) -> token::TokenClient<'_> {
        let token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        token::TokenClient::new(env, &token)
    }

    fn extend_ttl(env: &Env, key: &DataKey) {
        env.storage().persistent().extend_ttl(key, LEDGER_TTL_THRESHOLD, LEDGER_TTL_EXTEND);
    }

    // Keeps the instance entry (admin, token, tiers, counters) alive. Mirrors
    // `loktin_common::extend_ttl_instance`.
    fn extend_ttl_instance(env: &Env) {
        env.storage().instance().extend_ttl(LEDGER_TTL_THRESHOLD, LEDGER_TTL_EXTEND);
    }
}
