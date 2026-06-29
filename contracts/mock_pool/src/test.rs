#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token::StellarAssetClient, Env};

const SECONDS_PER_YEAR_U64: u64 = 31_536_000;

fn setup() -> (Env, Address, Address, Address, MockPoolClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);

    let admin = Address::generate(&env);
    let supplier = Address::generate(&env);

    let issuer = Address::generate(&env);
    let asset = env.register_stellar_asset_contract_v2(issuer.clone());
    let token_addr = asset.address();
    let token_admin = StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&supplier, &10_000_000_000_i128); // 1000 USDC (7 decimals)
    token_admin.mint(&admin, &10_000_000_000_i128); // 1000 USDC for the reserve

    // 10% APY (1000 bps)
    let contract_id = env.register(MockPool, (admin.clone(), token_addr.clone(), 1000u32));
    let client = MockPoolClient::new(&env, &contract_id);

    (env, admin, supplier, token_addr, client)
}

#[test]
fn test_supply_records_principal() {
    let (_env, _admin, supplier, _t, client) = setup();
    client.supply(&supplier, &1_000_000_000); // 100 USDC
    assert_eq!(client.get_principal(&supplier), 1_000_000_000);
    assert_eq!(client.get_position(&supplier), 1_000_000_000); // no time elapsed yet
}

#[test]
fn test_yield_accrues_linearly() {
    let (env, _admin, supplier, _t, client) = setup();
    client.supply(&supplier, &1_000_000_000); // 100 USDC
    let now = env.ledger().timestamp();
    env.ledger().set_timestamp(now + SECONDS_PER_YEAR_U64);
    // 10% of 100 USDC = 10 USDC -> position 110 USDC
    assert_eq!(client.get_position(&supplier), 1_100_000_000);
    assert_eq!(client.get_principal(&supplier), 1_000_000_000); // principal unchanged
}

#[test]
fn test_withdraw_principal_plus_yield() {
    let (env, _admin, supplier, token_addr, client) = setup();
    client.fund_reserve(&1_000_000_000); // 100 USDC reserve covers yield
    client.supply(&supplier, &1_000_000_000); // 100 USDC
    let now = env.ledger().timestamp();
    env.ledger().set_timestamp(now + SECONDS_PER_YEAR_U64);

    let out = client.withdraw(&supplier, &1_100_000_000); // full 110 USDC
    assert_eq!(out, 1_100_000_000);
    assert_eq!(client.get_position(&supplier), 0);

    // supplier: 1000 - 100 supplied + 110 withdrawn = 1010 USDC
    let token = soroban_sdk::token::TokenClient::new(&env, &token_addr);
    assert_eq!(token.balance(&supplier), 10_100_000_000);
}

#[test]
fn test_withdraw_more_than_available_fails() {
    let (_env, _admin, supplier, _t, client) = setup();
    client.supply(&supplier, &1_000_000_000);
    assert!(client.try_withdraw(&supplier, &2_000_000_000).is_err());
}

#[test]
fn test_partial_withdraw_keeps_principal_earning() {
    let (env, _admin, supplier, _t, client) = setup();
    client.fund_reserve(&1_000_000_000);
    client.supply(&supplier, &1_000_000_000); // 100 USDC
    let now = env.ledger().timestamp();
    env.ledger().set_timestamp(now + SECONDS_PER_YEAR_U64);

    // position is 110; withdraw the 10 USDC of yield, principal stays 100
    client.withdraw(&supplier, &100_000_000);
    assert_eq!(client.get_principal(&supplier), 1_000_000_000);
    assert_eq!(client.get_position(&supplier), 1_000_000_000);
}

#[test]
fn test_multiple_supplies_accrue_on_total() {
    let (env, _admin, supplier, _t, client) = setup();
    client.supply(&supplier, &1_000_000_000); // 100 USDC
    let now = env.ledger().timestamp();
    env.ledger().set_timestamp(now + SECONDS_PER_YEAR_U64);
    // settle first year (10 USDC), then add 100 more
    client.supply(&supplier, &1_000_000_000); // principal now 200, accrued 10
    assert_eq!(client.get_principal(&supplier), 2_000_000_000);
    assert_eq!(client.get_position(&supplier), 2_100_000_000); // 200 + 10 accrued

    // another year on 200 USDC principal = +20 USDC -> 210 accrued + 200 = 230
    let now2 = env.ledger().timestamp();
    env.ledger().set_timestamp(now2 + SECONDS_PER_YEAR_U64);
    assert_eq!(client.get_position(&supplier), 2_300_000_000);
}

#[test]
fn test_set_apy() {
    let (_env, _admin, _supplier, _t, client) = setup();
    client.set_apy(&2000);
    assert_eq!(client.apy_bps(), 2000);
}
