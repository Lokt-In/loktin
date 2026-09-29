#![no_std]

//! # loktin-yield — share-vault accounting for Loktin savings contracts
//!
//! ## Why shares instead of promised yield?
//!
//! The previous approach (`locked_in`, `target_savings`) computed a yield figure
//! up-front from an APY table and promised to pay it at maturity. That promise
//! is only valid if the underlying Blend pool actually earned the projected
//! amount. When no pool is connected, or the pool underperforms, payout is
//! drawn from other users' principal — a structural insolvency path.
//!
//! This crate replaces the promise with ownership. Users hold **shares** of the
//! vault's aggregate pool position. At redemption, each share is worth:
//!
//! ```text
//! assets_per_share = total_assets / total_shares
//! ```
//!
//! If the pool earned nothing, `total_assets` equals the sum of all deposits and
//! every share redeems at exactly cost. If the pool earned 10%, every share
//! redeems at 1.1× cost. Insolvency is impossible **by construction**.
//!
//! ## Share math
//!
//! Two pure functions handle all accounting. They are intentionally stateless
//! so contracts can unit-test them without an `Env`.
//!
//! ### [`shares_for_deposit`]
//!
//! Mints shares proportional to the depositor's contribution relative to the
//! vault's current size:
//!
//! ```text
//! shares_minted = deposit * total_shares / total_assets   (existing vault)
//! shares_minted = deposit                                  (empty vault, 1:1)
//! ```
//!
//! **⚠ Zero-share guard — MUST be enforced by every caller ⚠**
//!
//! Once the share price rises above 1 (i.e. `total_assets > total_shares`), a
//! very small deposit may compute to zero shares via integer truncation. A
//! caller that accepts a zero-share mint has taken the user's USDC and given
//! them no claim on the vault. This is a silent, unrecoverable loss of funds.
//!
//! **Every contract that calls `shares_for_deposit` MUST check the return value
//! and abort the transaction if it is zero.** The recommended pattern is:
//!
//! ```rust,ignore
//! let shares = shares_for_deposit(amount, total_shares, total_assets);
//! if shares == 0 {
//!     return Err(Error::DepositTooSmall);
//! }
//! ```
//!
//! The minimum deposit that avoids a zero-share mint is approximately:
//! `ceil(total_assets / total_shares)` — i.e. at least one full unit of the
//! current share price.
//!
//! ### [`assets_for_shares`]
//!
//! Redeems shares at the current share price:
//!
//! ```text
//! redeemable = shares * total_assets / total_shares
//! ```
//!
//! Returns `0` when `total_shares` is zero (empty vault; nothing to redeem).
//!
//! ## Pool client trait
//!
//! [`PoolClient`] is the shared contract-client trait that every Loktin savings
//! contract uses to talk to the Blend pool (or to `mock_pool` in tests). Its
//! surface mirrors `mock_pool`'s `supply` / `withdraw` / `get_position` functions
//! so that swapping in real Blend later changes the deployed pool address, not
//! this interface.

mod pool;
mod vault;

pub use pool::Pool;
pub use vault::{assets_for_shares, shares_for_deposit};
