#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token::StellarAssetClient, token::TokenClient, Env, Symbol};

const SECONDS_PER_YEAR_U64: u64 = 31_536_000;

// Returns (env, admin, supplier, token, client).
fn setup() -> (Env, Address, Address, Address, MockPoolClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);

    let admin = Address::generate(&env);
    let supplier = Address::generate(&env);
    let fee_recipient = Address::generate(&env);

    let issuer = Address::generate(&env);
    let asset = env.register_stellar_asset_contract_v2(issuer.clone());
    let token_addr = asset.address();
    let token_admin = StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&supplier, &10_000_000_000_i128); // 1000 USDC (7 decimals)
    token_admin.mint(&admin, &10_000_000_000_i128); // 1000 USDC for the reserve

    // 10% APY (1000 bps)
    let contract_id = env.register(
        MockPool,
        (admin.clone(), Some(fee_recipient), token_addr.clone(), 1000u32),
    );
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
    let (env, admin, supplier, token_addr, client) = setup();
    client.fund_reserve(&admin, &1_000_000_000); // 100 USDC reserve covers yield
    client.supply(&supplier, &1_000_000_000); // 100 USDC
    let now = env.ledger().timestamp();
    env.ledger().set_timestamp(now + SECONDS_PER_YEAR_U64);

    let out = client.withdraw(&supplier, &1_100_000_000); // full 110 USDC
    assert_eq!(out, 1_100_000_000);
    assert_eq!(client.get_position(&supplier), 0);

    // supplier: 1000 - 100 supplied + 110 withdrawn = 1010 USDC
    let token = TokenClient::new(&env, &token_addr);
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
    let (env, admin, supplier, _t, client) = setup();
    client.fund_reserve(&admin, &1_000_000_000);
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
    let (_env, admin, _supplier, _t, client) = setup();
    client.set_apy(&admin, &2000);
    assert_eq!(client.apy_bps(), 2000);
}

// ── Role separation ──────────────────────────────────────────────────

#[test]
fn test_fee_recipient_is_distinct_and_not_the_admin() {
    let (_env, admin, _supplier, _t, client) = setup();
    let recipient = client.fee_recipient().expect("fee recipient set at construction");
    assert_ne!(recipient, admin);
    assert_eq!(client.get_admin().unwrap(), admin);
}

#[test]
fn test_fee_recipient_defaults_to_nothing_not_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let token_addr = env.register_stellar_asset_contract_v2(issuer).address();

    // No fee recipient passed → it must be nothing, never the admin.
    let contract_id =
        env.register(MockPool, (admin.clone(), Option::<Address>::None, token_addr.clone(), 1000u32));
    let client = MockPoolClient::new(&env, &contract_id);

    assert!(client.fee_recipient().is_none());
    assert_eq!(client.get_admin().unwrap(), admin);
}

#[test]
fn test_keeper_key_cannot_call_admin_functions() {
    let (env, admin, supplier, token, client) = setup();
    // Even an address explicitly granted the `keeper` role is rejected from
    // everything that is not a keeper function — and this pool has none.
    let keeper_role = Symbol::new(&env, "keeper");
    client.grant_role(&admin, &supplier, &keeper_role);

    assert!(client.try_set_apy(&supplier, &2000u32).is_err());
    assert!(client.try_set_fee_recipient(&supplier, &Some(token)).is_err());
    assert!(client.try_fund_reserve(&supplier, &1_000_000).is_err());
    assert!(client.try_pause(&supplier).is_err());
    assert!(client.try_unpause(&supplier).is_err());
    assert!(client.try_grant_role(&supplier, &supplier, &keeper_role).is_err());
    assert!(client.try_revoke_role(&supplier, &supplier, &keeper_role).is_err());
}

#[test]
fn test_unprivileged_caller_cannot_call_privileged_functions() {
    let (env, _admin, _supplier, _token, client) = setup();
    let outsider = Address::generate(&env);
    let keeper_role = Symbol::new(&env, "keeper");

    assert!(client.try_set_apy(&outsider, &2000u32).is_err());
    assert!(client.try_set_fee_recipient(&outsider, &Option::<Address>::None).is_err());
    assert!(client.try_fund_reserve(&outsider, &1_000_000).is_err());
    assert!(client.try_pause(&outsider).is_err());
    assert!(client.try_unpause(&outsider).is_err());
    assert!(client.try_grant_role(&outsider, &outsider, &keeper_role).is_err());
    assert!(client.try_revoke_role(&outsider, &outsider, &keeper_role).is_err());

    // `set_role_admin` and `renounce_admin` take no caller parameter: OZ gates
    // them on the stored admin's own signature. Prove that gate by dropping
    // every authorization instead of naming a caller.
    env.mock_auths(&[]);
    assert!(client.try_set_role_admin(&keeper_role, &keeper_role).is_err());
    assert!(client.try_renounce_admin().is_err());
}

// ── Pause ────────────────────────────────────────────────────────────

#[test]
fn test_paused_rejects_deposits_and_withdrawals_but_not_reads() {
    let (_env, admin, supplier, _token, client) = setup();
    client.supply(&supplier, &1_000_000_000); // 100 USDC

    client.pause(&admin);
    assert!(client.paused());

    // Deposits are rejected while paused.
    assert!(client.try_supply(&supplier, &10_000_000).is_err());

    // Withdrawals are rejected while paused.
    assert!(client.try_withdraw(&supplier, &10_000_000).is_err());

    // Reads stay callable while paused.
    assert_eq!(client.get_principal(&supplier), 1_000_000_000);
    assert_eq!(client.get_position(&supplier), 1_000_000_000);
    assert_eq!(client.apy_bps(), 1000);

    // Unpausing restores supply/withdraw and adds the elapsed yield.
    client.unpause(&admin);
    assert!(!client.paused());
    client.supply(&supplier, &10_000_000);
    assert_eq!(client.get_principal(&supplier), 1_010_000_000);
}

// ── Two-step admin transfer ──────────────────────────────────────────

#[test]
fn test_two_step_admin_transfer() {
    let (env, admin, _supplier, _t, client) = setup();
    let new_admin = Address::generate(&env);

    client.transfer_admin_role(&new_admin, &1000u32);
    assert_eq!(client.get_admin().unwrap(), admin.clone());

    client.accept_admin_transfer();
    assert_eq!(client.get_admin().unwrap(), new_admin.clone());

    // The new admin can now drive config…
    client.set_apy(&new_admin, &500u32);
    assert_eq!(client.apy_bps(), 500);

    // …and the previous admin is no longer privileged.
    assert!(client.try_set_apy(&admin, &600u32).is_err());
}
