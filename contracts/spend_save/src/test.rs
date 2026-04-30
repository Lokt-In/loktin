#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token::StellarAssetClient, Env};

const SECONDS_PER_DAY: u64 = 86_400;

// 2024-11-28 00:00:00 UTC = day 28 of November 2024
const TS_28TH: u64 = 1_732_752_000;
// 2024-11-15 00:00:00 UTC = day 15 of November 2024
const TS_15TH: u64 = 1_731_628_800;

fn setup_at(ts: u64) -> (Env, Address, Address, Address, SpendSaveClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(ts);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let issuer = Address::generate(&env);
    let asset = env.register_stellar_asset_contract_v2(issuer);
    let token_addr = asset.address();
    let token_admin = StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&user, &10_000_000_000_i128); // 1000 USDC

    let contract_id = env.register(SpendSave, (admin.clone(), token_addr.clone()));
    let client = SpendSaveClient::new(&env, &contract_id);

    (env, admin, user, token_addr, client)
}

#[test]
fn test_enroll_creates_position() {
    let (_env, _admin, user, _token, client) = setup_at(TS_15TH);
    client.enroll(&user, &1000u32); // 10%
    let p = client.get_position(&user);
    assert_eq!(p.save_percentage, 1000);
    assert_eq!(p.saved_balance, 0);
}

#[test]
fn test_enroll_invalid_percentage() {
    let (_env, _admin, user, _token, client) = setup_at(TS_15TH);
    let r1 = client.try_enroll(&user, &50u32);  // < 1%
    let r2 = client.try_enroll(&user, &6000u32); // > 50%
    assert!(r1.is_err());
    assert!(r2.is_err());
}

#[test]
fn test_spend_routes_correctly() {
    let (env, _admin, user, _token, client) = setup_at(TS_15TH);
    let recipient = Address::generate(&env);
    client.enroll(&user, &2000u32); // 20%

    let (sent, saved) = client.spend(&user, &recipient, &100_000_000); // 10 USDC
    assert_eq!(saved, 20_000_000); // 2 USDC
    assert_eq!(sent, 80_000_000);  // 8 USDC

    let token_client = soroban_sdk::token::TokenClient::new(&env, &client.usdc_token());
    assert_eq!(token_client.balance(&recipient), 80_000_000);

    let p = client.get_position(&user);
    assert_eq!(p.saved_balance, 20_000_000);
    assert_eq!(p.total_saved_lifetime, 20_000_000);
    assert_eq!(p.total_spent_lifetime, 80_000_000);
}

#[test]
fn test_withdraw_only_on_28th() {
    let (env, _admin, user, _token, client) = setup_at(TS_15TH);
    let recipient = Address::generate(&env);
    client.enroll(&user, &2000u32);
    client.spend(&user, &recipient, &100_000_000);

    // Day 15 — should fail
    let r = client.try_withdraw(&user, &10_000_000);
    assert!(r.is_err());

    // Move to the 28th
    env.ledger().set_timestamp(TS_28TH);
    assert!(client.is_withdrawal_day_now());
    client.withdraw(&user, &10_000_000);
    let p = client.get_position(&user);
    assert_eq!(p.saved_balance, 10_000_000);
}

#[test]
fn test_current_day_utc_is_correct() {
    let (_env, _admin, _user, _token, client) = setup_at(TS_28TH);
    assert_eq!(client.current_day_utc(), 28u32);

    let (env2, _, _, _, client2) = setup_at(TS_15TH);
    let _ = env2; // unused
    assert_eq!(client2.current_day_utc(), 15u32);
}

#[test]
fn test_blend_stubs() {
    let (_env, _admin, _user, _token, client) = setup_at(TS_15TH);
    client.deposit_to_blend(&100_000_000);
    client.withdraw_from_blend(&50_000_000);
    assert_eq!(client.blend_position(), 0);
}

const _: u64 = SECONDS_PER_DAY; // silence unused if not referenced
