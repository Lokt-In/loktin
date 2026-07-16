#![no_std]

mod error;
mod events;
mod test;
mod types;

use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};
use soroban_sdk::{
    contract, contractclient, contractimpl, symbol_short, token, vec, Address, Env, IntoVal, Map,
    Vec,
};

use error::Error;
use types::{DataKey, Lock};

const DAY_IN_LEDGERS: u32 = 17280;
const LEDGER_TTL_THRESHOLD: u32 = DAY_IN_LEDGERS * 30;
const LEDGER_TTL_EXTEND: u32 = DAY_IN_LEDGERS * 365;

const SECONDS_PER_MONTH: u64 = 2_592_000; // 30 days
const SECONDS_PER_YEAR: i128 = 31_536_000;
const BPS_DENOMINATOR: i128 = 10_000;

// ── Pool interface ───────────────────────────────────────────────────
// Minimal client for the (mock) Blend pool this contract supplies idle USDC to.
// Matches mock_pool's `supply` / `withdraw` / `get_position` surface; swapping in
// real Blend later only changes the bodies below, not this contract's public API.
#[contractclient(name = "PoolClient")]
pub trait Pool {
    fn supply(env: Env, from: Address, amount: i128);
    fn withdraw(env: Env, from: Address, amount: i128) -> i128;
    fn get_position(env: Env, supplier: Address) -> i128;
}

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

        // Default APY tiers: 1mo=4%, 3mo=6%, 6mo=8%, 12mo=10%
        let mut tiers: Map<u32, u32> = Map::new(&env);
        tiers.set(1, 400);
        tiers.set(3, 600);
        tiers.set(6, 800);
        tiers.set(12, 1000);
        env.storage().instance().set(&DataKey::ApyTiers, &tiers);
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
        Ok(())
    }

    pub fn pool(env: Env) -> Result<Address, Error> {
        Self::pool_addr(&env)
    }

    // ── for users ──

    // Lock USDC for a fixed duration. Returns the lock id.
    // Computes and stores projected_yield (display only for now).
    pub fn lock(env: Env, user: Address, amount: i128, duration_months: u32) -> Result<u64, Error> {
        user.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let apy_bps = Self::get_apy_for_duration(env.clone(), duration_months)?;
        if duration_months == 0 || duration_months > 60 {
            return Err(Error::InvalidDuration);
        }

        let token = Self::token_client(&env);
        token.transfer(&user, &env.current_contract_address(), &amount);

        let now = env.ledger().timestamp();
        let duration_seconds = (duration_months as u64) * SECONDS_PER_MONTH;
        let end_date = now + duration_seconds;
        // projected_yield = amount * apy_bps / 10000 * duration_seconds / SECONDS_PER_YEAR
        let projected_yield = amount * (apy_bps as i128) / BPS_DENOMINATOR
            * (duration_seconds as i128) / SECONDS_PER_YEAR;

        let id = Self::next_id(&env);
        let lock = Lock {
            id,
            user: user.clone(),
            amount,
            apy_basis_points: apy_bps,
            duration_seconds,
            start_date: now,
            end_date,
            projected_yield,
            is_unlocked: false,
        };

        env.storage().persistent().set(&DataKey::Lock(id), &lock);
        Self::extend_ttl(&env, &DataKey::Lock(id));

        let mut user_locks: Vec<u64> = env.storage().persistent()
            .get(&DataKey::UserLocks(user.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        user_locks.push_back(id);
        env.storage().persistent().set(&DataKey::UserLocks(user.clone()), &user_locks);
        Self::extend_ttl(&env, &DataKey::UserLocks(user.clone()));

        events::Locked { lock_id: id, user, amount, projected_yield }.publish(&env);
        Ok(id)
    }

    // Unlock and return principal. Reverts if before end_date.
    // (Yield from Blend is added when Blend integration is live.)
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

        // Pay principal + the yield projected at lock time. The principal always
        // lives either idle here or supplied to the pool; the yield is only real
        // if funds were put to work in the pool. Pull any shortfall from the pool,
        // capped at the pool position so this can never trap. If the pool can't
        // cover the full amount, pay what's available (principal is always covered).
        let mut payout = lock.amount + lock.projected_yield;
        let idle = token.balance(&self_addr);
        if idle < payout {
            let pulled = match Self::pool_addr(&env) {
                Ok(pool) => {
                    let pc = PoolClient::new(&env, &pool);
                    let position = pc.get_position(&self_addr);
                    let shortfall = payout - idle;
                    let pull = if shortfall <= position { shortfall } else { position };
                    if pull > 0 {
                        pc.withdraw(&self_addr, &pull);
                    }
                    pull
                }
                Err(_) => 0,
            };
            let available = idle + pulled;
            if available < payout {
                payout = available;
            }
        }
        token.transfer(&self_addr, &user, &payout);

        lock.is_unlocked = true;
        env.storage().persistent().set(&DataKey::Lock(lock_id), &lock);
        Self::extend_ttl(&env, &DataKey::Lock(lock_id));

        events::Unlocked { lock_id, user, payout }.publish(&env);
        Ok(payout)
    }

    // Read functions

    pub fn get_lock(env: Env, lock_id: u64) -> Result<Lock, Error> {
        env.storage().persistent().get(&DataKey::Lock(lock_id)).ok_or(Error::LockNotFound)
    }

    pub fn get_user_locks(env: Env, user: Address) -> Vec<u64> {
        env.storage().persistent()
            .get(&DataKey::UserLocks(user))
            .unwrap_or_else(|| Vec::new(&env))
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
        match Self::pool_addr(&env) {
            Ok(pool) => {
                PoolClient::new(&env, &pool).get_position(&env.current_contract_address())
            }
            Err(_) => 0,
        }
    }

    // Internal functions

    fn pool_addr(env: &Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Pool).ok_or(Error::PoolNotSet)
    }

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
}
