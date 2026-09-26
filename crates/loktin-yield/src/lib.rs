#![no_std]
//! Share-vault yield accounting for Loktin's yielding contracts.
//!
//! **Pay real yield, never a promise.** Instead of computing a yield amount up
//! front from an APY table and paying it at maturity, a locked position holds
//! `shares` of the pooled vault. Its payout is whatever those shares redeem for
//! at withdrawal time. If the pool earned nothing, a share is worth exactly what
//! was paid for it and nobody can withdraw another user's principal.
//!
//! ## How a contract uses this
//! - **Deposit `amount`:** measure `total_assets` *before* the deposit lands,
//!   call [`shares_for_deposit`], move the funds in, then add the minted shares
//!   to the vault-wide `total_shares`.
//! - **Withdraw:** `assets = `[`assets_for_shares`]`, move that much to the
//!   user, then subtract the shares from `total_shares`.
//!
//! This crate is pure math plus the pool interface. `total_shares` and each
//! position's share balance live in the calling contract's own storage.

use soroban_sdk::{contractclient, Address, Env};

/// Shares to mint for depositing `amount` into a vault that holds
/// `total_assets` and is backed by `total_shares`. The first deposit into an
/// empty vault mints 1:1.
///
/// `total_assets` must be measured **before** the deposit lands, otherwise the
/// depositor is credited shares against their own money and dilutes everyone
/// already in the vault.
///
/// ⚠️ **A zero-share mint takes the user's money and gives them no claim.**
/// This returns `0` when the deposit is too small to buy a whole share, which
/// happens as soon as the share price rises above 1. Callers **must** reject a
/// `shares == 0` result and refund/reject the deposit before transferring it in.
pub fn shares_for_deposit(amount: i128, total_shares: i128, total_assets: i128) -> i128 {
    if total_shares <= 0 || total_assets <= 0 {
        // Fresh (or drained) vault: bootstrap at one share per asset.
        amount
    } else {
        amount * total_shares / total_assets
    }
}

/// USDC redeemable for `shares` from a vault of `total_shares` shares holding
/// `total_assets`. Rounds down, so the vault can never pay out more than it
/// holds and the rounding dust stays with the remaining shareholders.
pub fn assets_for_shares(shares: i128, total_shares: i128, total_assets: i128) -> i128 {
    if total_shares <= 0 {
        0
    } else {
        shares * total_assets / total_shares
    }
}

/// A position's accrued yield: what its shares redeem for now, minus the
/// principal paid in. Zero when flat; negative only if the pool itself lost
/// value, and it is never a promise of a future figure.
pub fn position_yield(
    shares: i128,
    principal: i128,
    total_shares: i128,
    total_assets: i128,
) -> i128 {
    assets_for_shares(shares, total_shares, total_assets) - principal
}

/// Minimal client for the (mock) Blend pool the yielding contracts supply USDC
/// to. It matches `mock_pool`'s `supply` / `withdraw` / `get_position` surface,
/// so swapping in real Blend later changes the deployed pool address, not this
/// interface.
#[contractclient(name = "PoolClient")]
pub trait Pool {
    fn supply(env: Env, from: Address, amount: i128);
    fn withdraw(env: Env, from: Address, amount: i128) -> i128;
    fn get_position(env: Env, supplier: Address) -> i128;
}

#[cfg(test)]
mod test;
