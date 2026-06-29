#![no_std]

mod error;
mod events;
mod types;

use soroban_sdk::{contract, contractimpl, token, Address, Env};

use error::Error;
use types::{DataKey, SpendSavePosition};

const DAY_IN_LEDGERS: u32 = 17280;
const LEDGER_TTL_THRESHOLD: u32 = DAY_IN_LEDGERS * 30;
const LEDGER_TTL_EXTEND: u32 = DAY_IN_LEDGERS * 365;

const BPS_DENOMINATOR: i128 = 10_000;
const SECONDS_PER_DAY: u64 = 86_400;
const WITHDRAWAL_DAY: u32 = 28; // day of month

// ── Contract ─────────────────────────────────────────────────────────

#[contract]
pub struct SpendSave;

#[contractimpl]
impl SpendSave {
    pub fn __constructor(env: Env, admin: Address, usdc_token: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
    }

    // ── Admin ──

    pub fn admin(env: Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Admin).ok_or(Error::AdminNotSet)
    }

    pub fn usdc_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::UsdcToken).unwrap()
    }

    // User functions

    // Enroll or update save percentage (basis points: 100=1%, 5000=50%).
    pub fn enroll(env: Env, user: Address, save_percentage_bps: u32) -> Result<(), Error> {
        user.require_auth();
        if save_percentage_bps < 100 || save_percentage_bps > 5000 {
            return Err(Error::InvalidPercentage);
        }
        let now = env.ledger().timestamp();
        let existing = env.storage().persistent().get::<DataKey, SpendSavePosition>(&DataKey::Position(user.clone()));

        let position = match existing {
            Some(mut p) => {
                p.save_percentage = save_percentage_bps;
                p
            }
            None => SpendSavePosition {
                user: user.clone(),
                save_percentage: save_percentage_bps,
                saved_balance: 0,
                total_spent_lifetime: 0,
                total_saved_lifetime: 0,
                created_date: now,
            },
        };
        env.storage().persistent().set(&DataKey::Position(user.clone()), &position);
        Self::extend_ttl(&env, &DataKey::Position(user.clone()));

        events::Enrolled { user, save_percentage_bps }.publish(&env);
        Ok(())
    }

    // Spend USDC through Loktin: routes (1-pct) to recipient, (pct) to vault.
    // Pulls `total_amount` from user's wallet. Returns (sent_to_recipient, saved).
    pub fn spend(env: Env, user: Address, recipient: Address, total_amount: i128) -> Result<(i128, i128), Error> {
        user.require_auth();
        if total_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let mut position = env.storage().persistent().get::<DataKey, SpendSavePosition>(&DataKey::Position(user.clone()))
            .ok_or(Error::NotEnrolled)?;

        let saved = total_amount * (position.save_percentage as i128) / BPS_DENOMINATOR;
        let sent = total_amount - saved;

        let token = Self::token_client(&env);
        // Pull total_amount from user
        token.transfer(&user, &env.current_contract_address(), &total_amount);
        // Forward sent to recipient
        if sent > 0 {
            token.transfer(&env.current_contract_address(), &recipient, &sent);
        }
        // saved stays in this contract

        position.saved_balance += saved;
        position.total_spent_lifetime += sent;
        position.total_saved_lifetime += saved;
        env.storage().persistent().set(&DataKey::Position(user.clone()), &position);
        Self::extend_ttl(&env, &DataKey::Position(user.clone()));

        events::Spent { user, recipient, sent, saved }.publish(&env);
        Ok((sent, saved))
    }

    // Withdraw from saved_balance. Reverts unless current UTC date is the 28th.
    pub fn withdraw(env: Env, user: Address, amount: i128) -> Result<(), Error> {
        user.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        // Check it's the 28th of the month (UTC)
        if !Self::is_withdrawal_day(&env) {
            return Err(Error::NotWithdrawalDay);
        }
        let mut position = env.storage().persistent().get::<DataKey, SpendSavePosition>(&DataKey::Position(user.clone()))
            .ok_or(Error::NotEnrolled)?;
        if position.saved_balance < amount {
            return Err(Error::InsufficientSavedBalance);
        }

        let token = Self::token_client(&env);
        token.transfer(&env.current_contract_address(), &user, &amount);

        position.saved_balance -= amount;
        env.storage().persistent().set(&DataKey::Position(user.clone()), &position);
        Self::extend_ttl(&env, &DataKey::Position(user.clone()));

        events::Withdrawn { user, amount }.publish(&env);
        Ok(())
    }

    // Read functions

    pub fn get_position(env: Env, user: Address) -> Result<SpendSavePosition, Error> {
        env.storage().persistent().get(&DataKey::Position(user)).ok_or(Error::NotEnrolled)
    }

    /// Returns true iff current UTC date is the 28th.
    pub fn is_withdrawal_day_now(env: Env) -> bool {
        Self::is_withdrawal_day(&env)
    }

    /// Returns the day of month (1-31) for current UTC time.
    pub fn current_day_utc(env: Env) -> u32 {
        Self::utc_day_of_month(env.ledger().timestamp())
    }

    // Blend integration stubs

    pub fn deposit_to_blend(env: Env, amount: i128) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        events::BlendDeposit { amount }.publish(&env);
        Ok(())
    }

    pub fn withdraw_from_blend(env: Env, amount: i128) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        events::BlendWithdraw { amount }.publish(&env);
        Ok(())
    }

    pub fn blend_position(_env: Env) -> i128 {
        0
    }

    // Internal helpers

    fn token_client(env: &Env) -> token::TokenClient {
        let token: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        token::TokenClient::new(env, &token)
    }

    fn extend_ttl(env: &Env, key: &DataKey) {
        env.storage().persistent().extend_ttl(key, LEDGER_TTL_THRESHOLD, LEDGER_TTL_EXTEND);
    }

    fn is_withdrawal_day(env: &Env) -> bool {
        Self::utc_day_of_month(env.ledger().timestamp()) == WITHDRAWAL_DAY
    }

    // Compute UTC day-of-month (1-31) from a unix timestamp.
    fn utc_day_of_month(timestamp: u64) -> u32 {
        let days = timestamp / SECONDS_PER_DAY;
        // Civil from days (Howard Hinnant's date algorithm)
        // 719468 = days from 0000-03-01 to 1970-01-01
        let z = days as i64 + 719_468;
        let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
        let doe = (z - era * 146_097) as u64; // [0, 146096]
        let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365; // [0, 399]
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); // [0, 365]
        let mp = (5 * doy + 2) / 153; // [0, 11]
        let d = (doy - (153 * mp + 2) / 5 + 1) as u32; // [1, 31]
        d
    }
}

#[cfg(test)]
mod test;
