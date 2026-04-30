#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token::StellarAssetClient, Env};

fn setup() -> (Env, Address, Address, Address, LockedVaultClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let issuer = Address::generate(&env);
    let asset = env.register_stellar_asset_contract_v2(issuer);
    let token_addr = asset.address();
    let token_admin = StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&user, &10_000_000_000_i128); // 1000 USDC

    let contract_id = env.register(LockedVault, (admin.clone(), token_addr.clone()));
    let client = LockedVaultClient::new(&env, &contract_id);

    (env, admin, user, token_addr, client)
}

#[test]
fn test_default_apy_tiers() {
    let (_env, _admin, _user, _token, client) = setup();
    let tiers = client.get_apy_tiers();
    assert_eq!(tiers.get(1), Some(400));
    assert_eq!(tiers.get(3), Some(600));
    assert_eq!(tiers.get(6), Some(800));
    assert_eq!(tiers.get(12), Some(1000));
}

#[test]
fn test_lock_computes_projected_yield() {
    let (_env, _admin, user, _token, client) = setup();
    // Lock 100 USDC for 12 months at 10% APY
    let amount = 1_000_000_000_i128; // 100 USDC
    let id = client.lock(&user, &amount, &12u32);
    assert_eq!(id, 1);

    let lock = client.get_lock(&id);
    assert_eq!(lock.amount, amount);
    assert_eq!(lock.apy_basis_points, 1000);
    // Expected yield: 100 * 0.10 * (12*30 days)/365 ≈ 100 * 0.10 * 0.9863 ≈ 9.863
    // In stroops: 1_000_000_000 * 1000 / 10000 * (12*2592000) / 31536000
    //           = 100_000_000 * 31_104_000 / 31_536_000
    //           = ~98_630_137
    assert!(lock.projected_yield > 95_000_000); // ~9.5 USDC
    assert!(lock.projected_yield < 105_000_000); // ~10.5 USDC
}

#[test]
fn test_unlock_before_maturity_fails() {
    let (_env, _admin, user, _token, client) = setup();
    let id = client.lock(&user, &1_000_000_000, &3u32);
    let result = client.try_unlock(&user, &id);
    assert!(result.is_err());
}

#[test]
fn test_unlock_after_maturity_returns_principal() {
    let (env, _admin, user, _token, client) = setup();
    let amount = 500_000_000_i128;
    let id = client.lock(&user, &amount, &1u32);
    let lock = client.get_lock(&id);

    // Advance ledger past end_date
    env.ledger().set_timestamp(lock.end_date + 1);

    let payout = client.unlock(&user, &id);
    assert_eq!(payout, amount);

    let lock = client.get_lock(&id);
    assert_eq!(lock.is_unlocked, true);
}

#[test]
fn test_admin_can_change_apy_tier() {
    let (_env, _admin, _user, _token, client) = setup();
    client.set_apy_tier(&3u32, &750u32);
    assert_eq!(client.get_apy_for_duration(&3u32), 750);
}

#[test]
fn test_blend_stubs() {
    let (_env, _admin, _user, _token, client) = setup();
    client.deposit_to_blend(&100_000_000);
    client.withdraw_from_blend(&50_000_000);
    assert_eq!(client.blend_position(), 0);
}
