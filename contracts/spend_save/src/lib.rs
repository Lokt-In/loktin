#![no_std]
use loktin_common::{LEDGER_TTL_THRESHOLD, LEDGER_TTL_EXTEND};

mod error;
mod events;
mod types;

use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};
use soroban_sdk::{
    contract, contractclient, contractimpl, symbol_short, token, vec, Address, Env, IntoVal,
};

use error::Error;
use types::{DataKey, SpendSavePosition};

#[contractclient(name = "PoolClient")]
pub trait Pool {
    fn supply(env: Env, from: Address, amount: i128);
    fn withdraw(env: Env, from: Address, amount: i128) -> i128;
    fn get_position(env: Env, supplier: Address) -> i128;
}



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

    pub fn usdc_token(env: Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::UsdcToken).ok_or(Error::UsdcTokenNotSet)
    }

    pub fn set_pool(env: Env, pool: Address) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Pool, &pool);
        Ok(())
    }

    pub fn pool(env: Env) -> Result<Address, Error> {
        Self::pool_addr(&env)
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
                shares: 0,
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

        let token = Self::token_client(&env)?;
        let self_addr = env.current_contract_address();

        let total_assets = token.balance(&self_addr) + Self::blend_position_internal(&env);
        let total_shares = Self::total_shares(&env);

        let shares_to_mint = if total_shares == 0 || total_assets == 0 {
            saved
        } else {
            saved * total_shares / total_assets
        };

        if shares_to_mint == 0 && saved > 0 {
            return Err(Error::ZeroShares);
        }

        // Pull total_amount from user
        token.transfer(&user, &self_addr, &total_amount);
        // Forward sent to recipient
        if sent > 0 {
            token.transfer(&self_addr, &recipient, &sent);
        }
        // saved stays in this contract

        position.saved_balance += saved;
        position.shares += shares_to_mint;
        position.total_spent_lifetime += total_amount;
        position.total_saved_lifetime += saved;

        env.storage().instance().set(&DataKey::TotalShares, &(total_shares + shares_to_mint));
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

        let token = Self::token_client(&env)?;
        let self_addr = env.current_contract_address();

        let total_assets = token.balance(&self_addr) + Self::blend_position_internal(&env);
        let total_shares = Self::total_shares(&env);

        let shares_to_burn = if total_assets == 0 {
            amount
        } else {
            (amount * total_shares + total_assets - 1) / total_assets
        };

        if shares_to_burn == 0 || shares_to_burn > position.shares {
            return Err(Error::InsufficientSavedBalance);
        }

        let idle = token.balance(&self_addr);
        if idle < amount {
            let pulled = match Self::pool_addr(&env) {
                Ok(pool) => {
                    let pc = PoolClient::new(&env, &pool);
                    let pool_pos = pc.get_position(&self_addr);
                    let shortfall = amount - idle;
                    let pull = if shortfall <= pool_pos { shortfall } else { pool_pos };
                    if pull > 0 {
                        pc.withdraw(&self_addr, &pull);
                    }
                    pull
                }
                Err(_) => 0,
            };
            if idle + pulled < amount {
                return Err(Error::InsufficientSavedBalance);
            }
        }

        token.transfer(&self_addr, &user, &amount);

        position.saved_balance -= amount; // wait, if they earned yield, this could go negative?
        // Actually, if amount > saved_balance, we should handle it, or just use saved_balance as principal tracker loosely.
        if position.saved_balance < amount {
            position.saved_balance = 0;
        } else {
            position.saved_balance -= amount;
        }
        position.shares -= shares_to_burn;

        env.storage().instance().set(&DataKey::TotalShares, &(total_shares - shares_to_burn));
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
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let pool = Self::pool_addr(&env)?;
        let token = Self::usdc_token(env.clone())?;
        let self_addr = env.current_contract_address();

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

    pub fn withdraw_from_blend(env: Env, amount: i128) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let pool = Self::pool_addr(&env)?;
        PoolClient::new(&env, &pool).withdraw(&env.current_contract_address(), &amount);
        events::BlendWithdraw { amount }.publish(&env);
        Ok(())
    }

    pub fn blend_position(env: Env) -> i128 {
        Self::blend_position_internal(&env)
    }

    // Internal helpers

    fn token_client(env: &Env) -> Result<token::TokenClient<'_>, Error> {
        let token: Address = env.storage().instance().get(&DataKey::UsdcToken).ok_or(Error::UsdcTokenNotSet)?;
        Ok(token::TokenClient::new(env, &token))
    }

    fn pool_addr(env: &Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Pool).ok_or(Error::PoolNotSet)
    }

    fn total_shares(env: &Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalShares).unwrap_or(0)
    }

    fn blend_position_internal(env: &Env) -> i128 {
        match Self::pool_addr(env) {
            Ok(pool) => {
                PoolClient::new(env, &pool).get_position(&env.current_contract_address())
            }
            Err(_) => 0,
        }
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
