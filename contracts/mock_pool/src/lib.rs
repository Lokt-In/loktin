#![no_std]

//! Mock Blend pool.
//!
//! A simple stand-in for a Blend lending pool, for testnet demos
//! only. Suppliers `supply` USDC and earn a fixed APY (linear, no compounding)
//! that accrues with wall-clock time; `withdraw` returns principal + accrued
//! yield. Yield is paid out of an admin-funded reserve (`fund_reserve`).
//!
//! This is NOT Blend. The real Blend pool uses a `submit(Request[])` interface
//! with variable, utilization-driven rates. When Loktin wires real Blend, the
//! adapter lives in each savings contract's `deposit_to_blend` / `withdraw_from_blend`
//! bodies; the user-facing API never changes. The mock keeps a minimal
//! `supply` / `withdraw` / `get_position` surface so that wiring is easy to test.
//!
//! Access control follows the same shape as the savings contracts: OpenZeppelin
//! `stellar-access` for the admin (config + role grants + two-step transfer) and
//! `stellar-pausable` for the emergency stop. There is no keeper-role function
//! here — the pool has no scheduled task of its own.

mod error;
mod events;
mod test;
mod types;

use soroban_sdk::{contract, contractimpl, panic_with_error, token, Address, Env};
use stellar_access::access_control::{self as access_control, AccessControl, AccessControlError};
use stellar_macros::{default_impl, when_not_paused};
use stellar_contract_utils::pausable::{self as pausable, Pausable};

use error::Error;
use types::{DataKey, Position};

const DAY_IN_LEDGERS: u32 = 17280;
const LEDGER_TTL_THRESHOLD: u32 = DAY_IN_LEDGERS * 30;
const LEDGER_TTL_EXTEND: u32 = DAY_IN_LEDGERS * 365;

const BPS_DENOMINATOR: i128 = 10_000;
const SECONDS_PER_YEAR: i128 = 31_536_000;

// ── Contract ─────────────────────────────────────────────────────────

#[contract]
pub struct MockPool;

#[contractimpl]
impl MockPool {
    /// `admin` is the cold, offline address controlling config, role grants and
    /// pause. `fee_recipient` is a distinct address that only ever receives
    /// income: it defaults to *nothing* (`None`), never to `admin`. The pool has
    /// no fee stream, so the recipient is stored and reported but not yet paid.
    pub fn __constructor(
        env: Env,
        admin: Address,
        fee_recipient: Option<Address>,
        usdc_token: Address,
        apy_bps: u32,
    ) {
        admin.require_auth();
        access_control::set_admin(&env, &admin);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::ApyBps, &apy_bps);
        if let Some(recipient) = fee_recipient {
            env.storage().instance().set(&DataKey::FeeRecipient, &recipient);
        }
    }

    // ── Admin / config ──
    //
    // Admin functions compare the explicit `caller` against the address stored by
    // `set_admin` (so two-step transfer is respected) *and* require its auth, so a
    // keeper key is rejected even when the host would accept a signature. The
    // admin itself is read through OZ `AccessControl::get_admin`.

    pub fn set_apy(env: Env, caller: Address, apy_bps: u32) -> Result<(), Error> {
        Self::require_admin(&env, &caller);
        env.storage().instance().set(&DataKey::ApyBps, &apy_bps);
        events::ApySet { apy_bps }.publish(&env);
        Ok(())
    }

    pub fn apy_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::ApyBps).unwrap_or(0)
    }

    pub fn usdc_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::UsdcToken).unwrap()
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

    // Admin tops up the pool's USDC so it can pay accrued yield on withdrawal.
    pub fn fund_reserve(env: Env, caller: Address, amount: i128) -> Result<(), Error> {
        Self::require_admin(&env, &caller);
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let token = Self::token_client(&env);
        token.transfer(&caller, &env.current_contract_address(), &amount);
        events::ReserveFunded { amount }.publish(&env);
        Ok(())
    }

    // Total USDC the pool currently holds (supplied principal + yield reserve).
    pub fn reserve_balance(env: Env) -> i128 {
        Self::token_client(&env).balance(&env.current_contract_address())
    }

    // ── Supplier ──
    // State-changing and user-facing: pause-guarded.

    // Supply USDC into the pool. Pulls `amount` from `from`.
    // `from` is whoever supplies — a user, or a Loktin savings contract.
    #[when_not_paused]
    pub fn supply(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let token = Self::token_client(&env);
        token.transfer(&from, &env.current_contract_address(), &amount);

        let now = env.ledger().timestamp();
        let mut pos = Self::settled_position(&env, &from, now);
        pos.principal += amount;
        Self::save_position(&env, &from, &pos);

        events::Supplied { supplier: from, amount }.publish(&env);
        Ok(())
    }

    // Withdraw `amount` (drawn from accrued yield first, then principal) to `from`.
    #[when_not_paused]
    pub fn withdraw(env: Env, from: Address, amount: i128) -> Result<i128, Error> {
        from.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let now = env.ledger().timestamp();
        let mut pos = Self::settled_position(&env, &from, now);
        if amount > pos.principal + pos.accrued {
            return Err(Error::InsufficientPosition);
        }

        // Draw from accrued yield first, then dip into principal.
        if amount <= pos.accrued {
            pos.accrued -= amount;
        } else {
            pos.principal -= amount - pos.accrued;
            pos.accrued = 0;
        }

        Self::token_client(&env).transfer(&env.current_contract_address(), &from, &amount);
        Self::save_position(&env, &from, &pos);

        events::Withdrawn { supplier: from, amount }.publish(&env);
        Ok(amount)
    }

    // ── Reads ──
    // These stay callable while the contract is paused.

    // Current position value = principal + yield accrued up to *now*.
    // This is what a savings contract surfaces as `blend_position()`.
    pub fn get_position(env: Env, supplier: Address) -> i128 {
        let now = env.ledger().timestamp();
        let pos = Self::settled_position(&env, &supplier, now);
        pos.principal + pos.accrued
    }

    /// Principal only (excludes accrued yield).
    pub fn get_principal(env: Env, supplier: Address) -> i128 {
        Self::load_position(&env, &supplier).principal
    }

    // ── Internal ──

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

    // Load a position and roll its accrued yield forward to `now` (in memory).
    fn settled_position(env: &Env, supplier: &Address, now: u64) -> Position {
        let mut pos = Self::load_position(env, supplier);
        if pos.last_update == 0 {
            // First-ever interaction: anchor the clock, accrue nothing yet.
            pos.last_update = now;
            return pos;
        }
        if now > pos.last_update && pos.principal > 0 {
            let apy: u32 = env.storage().instance().get(&DataKey::ApyBps).unwrap_or(0);
            let elapsed = (now - pos.last_update) as i128;
            pos.accrued +=
                pos.principal * (apy as i128) * elapsed / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
        }
        pos.last_update = now;
        pos
    }

    fn load_position(env: &Env, supplier: &Address) -> Position {
        env.storage()
            .persistent()
            .get(&DataKey::Position(supplier.clone()))
            .unwrap_or(Position { principal: 0, accrued: 0, last_update: 0 })
    }

    fn save_position(env: &Env, supplier: &Address, pos: &Position) {
        let key = DataKey::Position(supplier.clone());
        env.storage().persistent().set(&key, pos);
        env.storage().persistent().extend_ttl(&key, LEDGER_TTL_THRESHOLD, LEDGER_TTL_EXTEND);
    }

    fn token_client(env: &Env) -> token::TokenClient<'_> {
        let token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        token::TokenClient::new(env, &token)
    }
}

// OZ `Pausable`: admin-only emergency stop. Reads stay callable while paused and
// `pause`/`unpause` are never pause-guarded.
#[contractimpl]
impl Pausable for MockPool {
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
impl AccessControl for MockPool {}
