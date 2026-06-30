#![cfg(test)]
extern crate std;

use super::*;
use mock_pool::{MockPool, MockPoolClient};
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token::StellarAssetClient, Env};

const ONE_YEAR: u64 = 31_536_000;

// Register a mock pool (10% APY) on the same token and point the contract at it.
fn setup_pool<'a>(
    env: &Env,
    admin: &Address,
    token_addr: &Address,
    client: &LockedInClient,
) -> MockPoolClient<'a> {
    let pool_id = env.register(MockPool, (admin.clone(), token_addr.clone(), 1000u32));
    let pool = MockPoolClient::new(env, &pool_id);
    client.set_pool(&pool_id);
    pool
}

fn setup() -> (Env, Address, Address, Address, LockedInClient<'static>) {
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

    let contract_id = env.register(LockedIn, (admin.clone(), token_addr.clone()));
    let client = LockedInClient::new(&env, &contract_id);

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
fn test_blend_position_zero_when_pool_unset() {
    let (_env, _admin, _user, _token, client) = setup();
    // No pool configured yet → position reads 0, deposit errors.
    assert_eq!(client.blend_position(), 0);
    assert!(client.try_deposit_to_blend(&100_000_000).is_err());
}

#[test]
fn test_blend_deposit_accrues_and_withdraws() {
    let (env, admin, user, token_addr, client) = setup();
    let _pool = setup_pool(&env, &admin, &token_addr, &client);

    // User locks 100 USDC → contract holds it idle.
    let amount = 1_000_000_000_i128;
    client.lock(&user, &amount, &12u32);

    // Keeper sweeps idle USDC into the pool.
    client.deposit_to_blend(&amount);
    assert_eq!(client.blend_position(), amount); // 100 USDC, no time elapsed

    // A year passes → 10% yield accrues in the pool.
    let now = env.ledger().timestamp();
    env.ledger().set_timestamp(now + ONE_YEAR);
    assert_eq!(client.blend_position(), 1_100_000_000); // 110 USDC

    // Keeper pulls 40 USDC back into the contract.
    client.withdraw_from_blend(&400_000_000);
    assert_eq!(client.blend_position(), 700_000_000); // 110 - 40 = 70 USDC left
}

#[test]
fn test_unlock_pays_principal_plus_yield_from_pool() {
    let (env, admin, user, token_addr, client) = setup();
    let pool = setup_pool(&env, &admin, &token_addr, &client);

    // Fund the pool's yield reserve so it can pay out more than principal.
    let token_admin = StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&admin, &1_000_000_000); // 100 USDC
    pool.fund_reserve(&1_000_000_000);

    // User locks 100 USDC for 12 months; keeper sweeps it all into the pool.
    let amount = 1_000_000_000_i128;
    let id = client.lock(&user, &amount, &12u32);
    let lock = client.get_lock(&id);
    client.deposit_to_blend(&amount); // contract now holds 0 idle USDC

    let token = soroban_sdk::token::TokenClient::new(&env, &token_addr);
    let user_before = token.balance(&user);

    // Advance to maturity and unlock.
    env.ledger().set_timestamp(lock.end_date + 1);
    let payout = client.unlock(&user, &id);

    // Paid principal + the yield projected at lock time, sourced from the pool.
    assert_eq!(payout, amount + lock.projected_yield);
    assert_eq!(token.balance(&user) - user_before, amount + lock.projected_yield);
    assert!(lock.projected_yield > 0);
}
