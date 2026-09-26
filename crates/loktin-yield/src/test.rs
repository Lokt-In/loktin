use crate::{assets_for_shares, position_yield, shares_for_deposit};

#[test]
fn first_deposit_mints_one_to_one() {
    assert_eq!(shares_for_deposit(100, 0, 0), 100);
}

#[test]
fn deposit_before_any_yield_mints_one_to_one() {
    // Vault: 100 shares / 100 assets. Depositing 50 mints 50.
    assert_eq!(shares_for_deposit(50, 100, 100), 50);
}

#[test]
fn second_depositor_does_not_dilute_the_first() {
    // A deposits 100 into an empty vault → 100 shares, principal 100.
    let a_shares = shares_for_deposit(100, 0, 0);
    assert_eq!(a_shares, 100);

    // The pool appreciates 10% before B arrives: A's 100 is now worth 110.
    let assets_before_b = 110;

    // B deposits 110 → 110 * 100 / 110 = 100 shares, principal 110.
    let b_shares = shares_for_deposit(110, a_shares, assets_before_b);
    assert_eq!(b_shares, 100);
    let total_shares = a_shares + b_shares; // 200

    // The whole vault then grows another 10% to 242.
    let total_assets = 242;

    // A put in 100 and redeems 121 → +21 real yield on its own money.
    assert_eq!(assets_for_shares(a_shares, total_shares, total_assets), 121);
    assert_eq!(position_yield(a_shares, 100, total_shares, total_assets), 21);

    // B put in 110 and redeems 121 → +11 real yield. Neither diluted the other.
    assert_eq!(assets_for_shares(b_shares, total_shares, total_assets), 121);
    assert_eq!(position_yield(b_shares, 110, total_shares, total_assets), 11);
}

#[test]
fn deposit_too_small_for_one_share_returns_zero() {
    // Share price is 10 assets (1000 assets / 100 shares): 9 buys 0.9 → 0.
    assert_eq!(shares_for_deposit(9, 100, 1000), 0);
    assert_eq!(shares_for_deposit(10, 100, 1000), 1); // exactly one share
    assert_eq!(shares_for_deposit(0, 100, 1000), 0);
}

#[test]
fn withdrawal_after_appreciation_returns_principal_plus_real_gain() {
    // The only position holds all 100 shares of a 110-asset vault.
    assert_eq!(assets_for_shares(100, 100, 110), 110);
    assert_eq!(position_yield(100, 100, 100, 110), 10);
}

/// The property that matters: summing what every holder can redeem never
/// exceeds what the vault holds, because redemption rounds down.
#[test]
fn total_redeemable_never_exceeds_the_pool() {
    let total_shares = 3;
    let total_assets = 10;

    let mut paid = 0;
    for _ in 0..3 {
        paid += assets_for_shares(1, total_shares, total_assets);
    }

    // Redeeming every share returns every asset exactly...
    assert_eq!(assets_for_shares(total_shares, total_shares, total_assets), total_assets);
    // ...and any split of them pays no more than the vault holds.
    assert!(paid <= total_assets);
}

#[test]
fn empty_or_shareless_vault_redeems_nothing() {
    assert_eq!(assets_for_shares(0, 0, 0), 0);
    assert_eq!(assets_for_shares(100, 0, 0), 0);
}

#[test]
fn negative_yield_when_pool_loses_value() {
    assert_eq!(position_yield(100, 100, 100, 90), -10);
}
