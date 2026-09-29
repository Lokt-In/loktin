/// Compute the number of shares to mint for a deposit.
///
/// # Arguments
///
/// * `deposit`       — amount of USDC being deposited (must be > 0)
/// * `total_shares`  — shares outstanding **before** this deposit
/// * `total_assets`  — USDC backing those shares **before** this deposit lands
///                     (i.e. measure the pool position *before* transferring
///                     the deposit in, so new yield is already reflected)
///
/// # Returns
///
/// The number of new shares to mint, truncated toward zero.
///
/// # First deposit
///
/// When `total_shares == 0` (empty vault), shares are issued 1:1 with the
/// deposit amount. `total_assets` is ignored in this case.
///
/// # ⚠ Zero-share guard — callers MUST enforce this ⚠
///
/// Once the share price exceeds 1 (`total_assets > total_shares`), a small
/// deposit may round down to zero shares. A zero-share mint is a silent,
/// unrecoverable loss of the depositor's funds — the USDC enters the vault but
/// the user receives no claim on it.
///
/// **Every contract that calls this function MUST reject a zero return value.**
///
/// ```rust,ignore
/// let shares = shares_for_deposit(amount, total_shares, total_assets);
/// if shares == 0 {
///     return Err(Error::DepositTooSmall);
/// }
/// ```
pub fn shares_for_deposit(deposit: i128, total_shares: i128, total_assets: i128) -> i128 {
    if total_shares == 0 {
        // Empty vault: seed at 1 share per 1 stroops of USDC.
        return deposit;
    }
    // Proportional mint. Integer division truncates toward zero, which is the
    // safe direction — we never over-issue shares.
    deposit * total_shares / total_assets
}

/// Compute the USDC redeemable for a given number of shares.
///
/// # Arguments
///
/// * `shares`       — shares being redeemed
/// * `total_shares` — total shares outstanding (including the ones being redeemed)
/// * `total_assets` — total USDC in the vault at this instant
///                    (i.e. `pool.get_position(self_addr)`)
///
/// # Returns
///
/// The USDC amount the holder can withdraw. Truncated toward zero — the vault
/// always retains any fractional stroop rather than paying it out.
///
/// Returns `0` when `total_shares` is zero (uninitialised or drained vault).
pub fn assets_for_shares(shares: i128, total_shares: i128, total_assets: i128) -> i128 {
    if total_shares == 0 {
        return 0;
    }
    shares * total_assets / total_shares
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── shares_for_deposit ────────────────────────────────────────────────────

    #[test]
    fn first_deposit_mints_one_to_one() {
        // Empty vault: 1 000 USDC → 1 000 shares regardless of total_assets.
        assert_eq!(shares_for_deposit(1_000, 0, 0), 1_000);
        // total_assets is ignored when total_shares == 0.
        assert_eq!(shares_for_deposit(1_000, 0, 999_999), 1_000);
    }

    #[test]
    fn second_deposit_scales_with_existing_price() {
        // Vault has 1 000 shares backing 1 000 USDC (price = 1).
        // Depositing 500 should mint 500 shares.
        assert_eq!(shares_for_deposit(500, 1_000, 1_000), 500);
    }

    #[test]
    fn share_price_above_one_mints_fewer_shares() {
        // Vault has 1 000 shares backing 1 100 USDC (10% yield earned).
        // Depositing 1 100 should mint 1 000 shares (price = 1.1 per share).
        assert_eq!(shares_for_deposit(1_100, 1_000, 1_100), 1_000);
    }

    #[test]
    fn zero_share_case_when_deposit_too_small() {
        // Vault: 1 000 shares, 2 000 USDC (price = 2.0).
        // A 1-stroop deposit yields 0 shares via truncation.
        // Callers MUST reject this — the test just confirms the value.
        assert_eq!(shares_for_deposit(1, 1_000, 2_000), 0);
    }

    #[test]
    fn truncation_favours_vault() {
        // 3 shares backing 10 USDC → price ≈ 3.33.
        // A 5-USDC deposit: 5 * 3 / 10 = 1 (truncated from 1.5).
        assert_eq!(shares_for_deposit(5, 3, 10), 1);
    }

    // ── assets_for_shares ─────────────────────────────────────────────────────

    #[test]
    fn redeem_all_shares_returns_all_assets() {
        assert_eq!(assets_for_shares(1_000, 1_000, 1_100), 1_100);
    }

    #[test]
    fn redeem_half_shares_returns_half_assets() {
        assert_eq!(assets_for_shares(500, 1_000, 1_000), 500);
    }

    #[test]
    fn redeem_no_yield_returns_principal() {
        // Pool earned nothing: assets == deposits. User gets back exactly what
        // they put in (no surplus, no deficit).
        assert_eq!(assets_for_shares(1_000, 1_000, 1_000), 1_000);
    }

    #[test]
    fn empty_vault_returns_zero() {
        assert_eq!(assets_for_shares(100, 0, 0), 0);
        assert_eq!(assets_for_shares(100, 0, 500), 0);
    }

    #[test]
    fn truncation_favours_vault_on_redeem() {
        // 3 shares, 10 USDC total. Redeeming 1 share: 1 * 10 / 3 = 3 (not 3.33).
        assert_eq!(assets_for_shares(1, 3, 10), 3);
    }

    // ── insolvency-impossibility proof ───────────────────────────────────────
    //
    // Reproduce the two-user scenario from the issue:
    //   • User A and User B each deposit 1 000 USDC.
    //   • Pool earns nothing (blend_position returns exactly what was put in).
    //   • Both users redeem. Neither should receive more than 1 000 USDC.

    #[test]
    fn two_users_no_yield_no_insolvency() {
        // --- User A deposits 1 000 into empty vault ---
        let a_deposit = 1_000_i128;
        let shares_a = shares_for_deposit(a_deposit, 0, 0);
        assert_eq!(shares_a, 1_000); // 1:1 seed

        let mut total_shares = shares_a; // 1 000
        let mut total_assets = a_deposit; // 1 000

        // --- User B deposits 1 000 ---
        let b_deposit = 1_000_i128;
        let shares_b = shares_for_deposit(b_deposit, total_shares, total_assets);
        assert_eq!(shares_b, 1_000); // price still 1:1

        total_shares += shares_b; // 2 000
        total_assets += b_deposit; // 2 000

        // Pool earns nothing. total_assets stays 2 000.

        // --- User A redeems ---
        let a_payout = assets_for_shares(shares_a, total_shares, total_assets);
        assert_eq!(a_payout, 1_000); // exactly principal, no bonus

        total_shares -= shares_a;
        total_assets -= a_payout;

        // --- User B redeems ---
        let b_payout = assets_for_shares(shares_b, total_shares, total_assets);
        assert_eq!(b_payout, 1_000); // exactly principal, no deficit

        // Vault is clean.
        assert_eq!(total_shares - shares_b, 0);
        assert_eq!(total_assets - b_payout, 0);
    }

    #[test]
    fn two_users_with_yield_distributed_proportionally() {
        // --- User A deposits 1 000 ---
        let shares_a = shares_for_deposit(1_000, 0, 0);
        let mut total_shares = shares_a;
        let mut total_assets = 1_000_i128;

        // Pool earns 100 USDC before User B deposits (total_assets = 1 100).
        total_assets += 100;

        // --- User B deposits 1 000 when price = 1.1 ---
        // B should get fewer shares: 1 000 * 1 000 / 1 100 = 909
        let shares_b = shares_for_deposit(1_000, total_shares, total_assets);
        assert_eq!(shares_b, 909);

        total_shares += shares_b;
        total_assets += 1_000;

        // Pool earns another 100 USDC (total_assets = 2 200).
        total_assets += 100;

        // A redeems all 1 000 shares out of 1 909 total, gets more than 1 000.
        let a_payout = assets_for_shares(shares_a, total_shares, total_assets);
        assert!(a_payout > 1_000, "A should profit from yield earned before B joined");

        total_shares -= shares_a;
        total_assets -= a_payout;

        // B redeems 909 shares, gets back at most what they put in plus their
        // proportional share of the second 100 earned after they joined.
        let b_payout = assets_for_shares(shares_b, total_shares, total_assets);
        assert!(b_payout >= 1_000, "B should not lose principal");

        // Vault drains cleanly (residual is at most rounding dust).
        let residual = total_assets - b_payout;
        assert!(residual >= 0, "vault never goes negative");
        assert!(residual < 5, "rounding dust is tiny");
    }
}
