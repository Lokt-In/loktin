//! Pure-math unit tests for the share-vault + performance-fee logic. The pool
//! *interaction* helpers (`pool_deposit` / `pool_withdraw` / `pool_value`) need
//! a real contract context and are exercised end-to-end by the first contract
//! that uses them (Bill Plans, Stage 1) rather than duplicating heavy soroban
//! test scaffolding here.
//!
//! `total_assets` is a given in these tests — pool-model-agnostic on purpose, so
//! we're testing the apportioning, not the pool's accrual.

use crate::{assets_for_shares, perf_fee, position_yield, shares_for_deposit};

#[test]
fn first_deposit_mints_one_to_one() {
    assert_eq!(shares_for_deposit(100, 0, 0), 100);
}

#[test]
fn deposit_before_any_yield_mints_one_to_one() {
    // vault: 100 shares / 100 assets. Depositing 50 mints 50.
    assert_eq!(shares_for_deposit(50, 100, 100), 50);
}

#[test]
fn deposit_after_yield_mints_fewer_shares() {
    // vault grew: 100 shares now worth 120. Depositing 60 → 60 * 100 / 120 = 50.
    assert_eq!(shares_for_deposit(60, 100, 120), 50);
}

#[test]
fn redeem_reflects_growth() {
    assert_eq!(assets_for_shares(100, 100, 120), 120); // all shares → full value
    assert_eq!(assets_for_shares(50, 100, 120), 60); // half the shares → half
}

#[test]
fn empty_or_shareless_vault_redeems_nothing() {
    assert_eq!(assets_for_shares(0, 0, 0), 0);
    assert_eq!(assets_for_shares(100, 0, 0), 0); // no shares exist to redeem
}

#[test]
fn yield_is_zero_when_flat() {
    assert_eq!(position_yield(100, 100, 100, 100), 0);
}

/// The core correctness property: two depositors who join at different times
/// each earn on their own money, and neither dilutes the other.
#[test]
fn two_depositors_split_yield_by_their_own_stake() {
    // A deposits 100 into an empty vault → 100 shares, principal 100.
    let a_shares = shares_for_deposit(100, 0, 0);
    assert_eq!(a_shares, 100);
    let mut total_shares = a_shares;

    // The pool grows 10% before B arrives: A's 100 is now worth 110.
    let assets_before_b = 110;

    // B deposits 110 → 110 * 100 / 110 = 100 shares, principal 110.
    let b_shares = shares_for_deposit(110, total_shares, assets_before_b);
    assert_eq!(b_shares, 100);
    total_shares += b_shares; // 200

    // Vault now holds A's 110 + B's 110 = 220, then grows another 10% to 242.
    let total_assets = 242;

    // A: 100/200 of 242 = 121, having put in 100 → +21 yield.
    assert_eq!(assets_for_shares(a_shares, total_shares, total_assets), 121);
    assert_eq!(position_yield(a_shares, 100, total_shares, total_assets), 21);

    // B: 100/200 of 242 = 121, having put in 110 → +11 yield.
    assert_eq!(assets_for_shares(b_shares, total_shares, total_assets), 121);
    assert_eq!(position_yield(b_shares, 110, total_shares, total_assets), 11);
}

#[test]
fn perf_fee_on_positive_yield_only() {
    assert_eq!(perf_fee(1000, 100), 10); // 10% of 100
    assert_eq!(perf_fee(1000, 0), 0);
    assert_eq!(perf_fee(1000, -5), 0); // never on a loss
    assert_eq!(perf_fee(0, 100), 0); // no fee configured
}

#[test]
fn perf_fee_scales_with_bps() {
    assert_eq!(perf_fee(1000, 1_000), 100); // 10%
    assert_eq!(perf_fee(500, 1_000), 50); // 5%
    assert_eq!(perf_fee(2000, 1_000), 200); // 20% ceiling
}

#[test]
fn perf_fee_truncates_down() {
    // 10% of 15 = 1.5 → truncates to 1 (never over-charges the user).
    assert_eq!(perf_fee(1000, 15), 1);
}

// ── Edge cases ───────────────────────────────────────────────────────

/// The share-vault footgun: after yield accrues, a share is worth > 1 asset, so
/// a deposit too small to buy a whole share mints 0. Contracts MUST reject a
/// 0-share deposit; this pins the behaviour so that guard is never dropped.
#[test]
fn dust_deposit_rounds_to_zero_shares() {
    assert_eq!(shares_for_deposit(1, 100, 1000), 0); // 1 * 100 / 1000 = 0.1 → 0
    assert_eq!(shares_for_deposit(9, 100, 1000), 0); // 0.9 → 0
    assert_eq!(shares_for_deposit(10, 100, 1000), 1); // exactly one share
}

/// Shares exist but the pool reports 0 value (fully drained edge). The guard
/// treats it as a fresh vault (mint 1:1) rather than dividing by zero.
#[test]
fn deposit_into_drained_vault_bootstraps() {
    assert_eq!(shares_for_deposit(50, 100, 0), 50);
}

#[test]
fn zero_amount_mints_zero_shares() {
    assert_eq!(shares_for_deposit(0, 100, 100), 0);
    assert_eq!(shares_for_deposit(0, 0, 0), 0);
}

/// Redemption truncates down, so the vault is never over-paid (rounding dust
/// stays with the pool, protecting the remaining depositors).
#[test]
fn assets_for_shares_rounds_down_favouring_the_vault() {
    assert_eq!(assets_for_shares(1, 3, 10), 3); // 3.33 → 3
}

/// Redeeming every share returns every asset exactly — no dust trapped.
#[test]
fn redeeming_all_shares_returns_all_assets() {
    assert_eq!(assets_for_shares(200, 200, 242), 242);
}

/// If the pool ever reports less than principal, yield is negative and the fee
/// is zero — never charged on a loss.
#[test]
fn negative_yield_when_pool_loses_value() {
    assert_eq!(position_yield(100, 100, 100, 90), -10);
    assert_eq!(perf_fee(1000, position_yield(100, 100, 100, 90)), 0);
}

/// The pure fee fn trusts its bps input; the MAX_PERF_FEE_BPS ceiling is
/// enforced by the contract's `set_perf_fee_bps`, not here. Documented so
/// callers never assume self-clamping.
#[test]
fn perf_fee_does_not_self_clamp_to_max() {
    assert_eq!(perf_fee(5000, 1_000), 500); // 50% — a contract would reject this at set-time
}

/// Large-but-realistic values (≈ millions of USDC in stroops) don't overflow
/// i128 in the mul-before-div. Extreme adversarial magnitudes would panic under
/// `overflow-checks` rather than wrap — same i128 posture as the live contracts;
/// flagged as a known bound, not silent corruption.
#[test]
fn handles_large_realistic_magnitudes() {
    let big: i128 = 100_000_000_000_000; // 10M USDC in stroops
    assert_eq!(shares_for_deposit(big, big, big), big);
    assert_eq!(assets_for_shares(big, big, big), big);
}
