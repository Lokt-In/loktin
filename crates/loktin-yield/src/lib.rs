#![no_std]
//! Shared Blend share-vault + performance-fee math for Loktin's yielding
//! contracts (Bill Plans, Spend & Save).
//!
//! **Model B — pass-through yield.** User funds are supplied into a Blend pool;
//! the contract tracks each position's `shares` of that pool, and yield is the
//! *real* appreciation — what the shares redeem for now, minus what was put in —
//! not a promised APY. The mock pool stands in for real Blend on testnet; only
//! the deployed pool changes for mainnet, not this interface.
//!
//! The performance fee is taken on **positive yield only**, never on principal.
//!
//! ## How a contract uses this
//! - **Deposit `amount`:** read `total_assets` (`pool_value`) *before* moving
//!   funds, `shares_for_deposit(amount, total_shares, total_assets)`, then
//!   `pool_deposit`; add the shares to the position and to the vault-wide
//!   `total_shares`, and add `amount` to the position's `principal`.
//! - **Withdraw:** `assets = assets_for_shares(pos.shares, total_shares,
//!   pool_value)`, `fee = perf_fee(bps, assets - pos.principal)`, `pool_withdraw`
//!   the assets, pay the user `assets - fee` and the recipient `fee`; subtract
//!   the shares from the position and `total_shares`.
//!
//! `total_shares` and each position's `shares`/`principal` are the calling
//! contract's own ledger; this crate only supplies the pure math and the pool
//! calls.

use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};
use soroban_sdk::{contractclient, symbol_short, vec, Address, Env, IntoVal};

/// Basis-point denominator (100% = 10_000 bps).
pub const BPS_DENOMINATOR: i128 = 10_000;

/// Hard ceiling on the performance fee: 20%. Contracts enforce this in their
/// `set_perf_fee_bps`; the constant lives here with the fee math.
pub const MAX_PERF_FEE_BPS: u32 = 2_000;

// ── Pool interface ───────────────────────────────────────────────────
/// Minimal client for the (mock) Blend pool the yielding contracts supply USDC
/// to. Matches `mock_pool`'s surface; swapping in real Blend later changes only
/// the deployed pool, not this interface.
#[contractclient(name = "PoolClient")]
pub trait Pool {
    fn supply(env: Env, from: Address, amount: i128);
    fn withdraw(env: Env, from: Address, amount: i128) -> i128;
    fn get_position(env: Env, supplier: Address) -> i128;
}

// ── Share-vault math (pure) ──────────────────────────────────────────
// ERC-4626-style accounting: a position's claim on the pool is its `shares` of
// the vault-wide `total_shares`, worth a proportional slice of `total_assets`
// (what the pool would pay the contract right now). Depositing at different
// times therefore never dilutes an earlier depositor's accrued yield.

/// Shares to mint for depositing `amount` into a vault holding `total_assets`,
/// backed by `total_shares`. The first deposit (empty vault) mints 1:1.
/// `total_assets` must be measured **before** the deposit lands.
///
/// ⚠️ Returns **0** when `amount` is too small to buy a whole share (share price
/// rises above 1 once yield accrues). The caller **MUST reject a 0-share mint**,
/// otherwise the depositor pays in and receives no claim — their principal is
/// swallowed. Every contract using this guards `shares > 0` on deposit.
pub fn shares_for_deposit(amount: i128, total_shares: i128, total_assets: i128) -> i128 {
    if total_shares <= 0 || total_assets <= 0 {
        amount
    } else {
        amount * total_shares / total_assets
    }
}

/// USDC redeemable for `shares` from a vault of (`total_shares`, `total_assets`).
pub fn assets_for_shares(shares: i128, total_shares: i128, total_assets: i128) -> i128 {
    if total_shares <= 0 {
        0
    } else {
        shares * total_assets / total_shares
    }
}

/// A position's accrued yield: what its shares redeem for now, minus its
/// principal. Zero when flat; in a healthy lending pool it does not go negative.
pub fn position_yield(
    shares: i128,
    principal: i128,
    total_shares: i128,
    total_assets: i128,
) -> i128 {
    assets_for_shares(shares, total_shares, total_assets) - principal
}

/// Performance fee: `perf_fee_bps` of **positive** yield only. Never on
/// principal, never negative.
pub fn perf_fee(perf_fee_bps: u32, yield_amount: i128) -> i128 {
    if yield_amount <= 0 {
        0
    } else {
        yield_amount * (perf_fee_bps as i128) / BPS_DENOMINATOR
    }
}

// ── Pool interaction helpers ─────────────────────────────────────────
// Behaviour copied from the proven deposit/withdraw path in target_savings, so
// both new contracts share one implementation.

/// Supply `amount` USDC from this contract into the pool. Pre-authorizes the
/// nested `token.transfer(self -> pool)` the pool makes inside `supply`.
pub fn pool_deposit(env: &Env, pool: &Address, token: &Address, amount: i128) {
    let self_addr = env.current_contract_address();
    env.authorize_as_current_contract(vec![
        env,
        InvokerContractAuthEntry::Contract(SubContractInvocation {
            context: ContractContext {
                contract: token.clone(),
                fn_name: symbol_short!("transfer"),
                args: (self_addr.clone(), pool.clone(), amount).into_val(env),
            },
            sub_invocations: vec![env],
        }),
    ]);
    PoolClient::new(env, pool).supply(&self_addr, &amount);
}

/// Redeem `amount` USDC worth from the pool back to this contract. Returns the
/// USDC actually withdrawn.
pub fn pool_withdraw(env: &Env, pool: &Address, amount: i128) -> i128 {
    PoolClient::new(env, pool).withdraw(&env.current_contract_address(), &amount)
}

/// What the pool would pay this contract right now (principal + accrued). Use as
/// `total_assets` when all vault funds live in the pool.
pub fn pool_value(env: &Env, pool: &Address) -> i128 {
    PoolClient::new(env, pool).get_position(&env.current_contract_address())
}

#[cfg(test)]
mod test;
