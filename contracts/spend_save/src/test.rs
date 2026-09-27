#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token::StellarAssetClient, token::TokenClient, Env, Symbol};

const SECONDS_PER_DAY: u64 = 86_400;

// 2024-11-28 00:00:00 UTC = day 28 of November 2024
const TS_28TH: u64 = 1_732_752_000;
// 2024-11-15 00:00:00 UTC = day 15 of November 2024
const TS_15TH: u64 = 1_731_628_800;

// Returns (env, admin, keeper, user, token, client). The keeper holds the
// `keeper` role and is the only address allowed to call the blend sweeps.
fn setup_at(ts: u64) -> (Env, Address, Address, Address, Address, SpendSaveClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(ts);

    let admin = Address::generate(&env);
    let keeper = Address::generate(&env);
    let user = Address::generate(&env);
    let fee_recipient = Address::generate(&env);
    let issuer = Address::generate(&env);
    let asset = env.register_stellar_asset_contract_v2(issuer);
    let token_addr = asset.address();
    let token_admin = StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&user, &10_000_000_000_i128); // 1000 USDC

    let contract_id =
        env.register(SpendSave, (admin.clone(), Some(fee_recipient), token_addr.clone()));
    let client = SpendSaveClient::new(&env, &contract_id);
    client.grant_role(&admin, &keeper, &Symbol::new(&env, "keeper"));

    (env, admin, keeper, user, token_addr, client)
}

#[test]
fn test_enroll_creates_position() {
    let (_env, _admin, _keeper, user, _token, client) = setup_at(TS_15TH);
    client.enroll(&user, &1000u32); // 10%
    let p = client.get_position(&user);
    assert_eq!(p.save_percentage, 1000);
    assert_eq!(p.saved_balance, 0);
}

#[test]
fn test_enroll_invalid_percentage() {
    let (_env, _admin, _keeper, user, _token, client) = setup_at(TS_15TH);
    let r1 = client.try_enroll(&user, &50u32);  // < 1%
    let r2 = client.try_enroll(&user, &6000u32); // > 50%
    assert!(r1.is_err());
    assert!(r2.is_err());
}

#[test]
fn test_spend_routes_correctly() {
    let (env, _admin, _keeper, user, _token, client) = setup_at(TS_15TH);
    let recipient = Address::generate(&env);
    client.enroll(&user, &2000u32); // 20%

    let (sent, saved) = client.spend(&user, &recipient, &100_000_000); // 10 USDC
    assert_eq!(saved, 20_000_000); // 2 USDC
    assert_eq!(sent, 80_000_000);  // 8 USDC

    let token_client = TokenClient::new(&env, &client.usdc_token());
    assert_eq!(token_client.balance(&recipient), 80_000_000);

    let p = client.get_position(&user);
    assert_eq!(p.saved_balance, 20_000_000);
    assert_eq!(p.total_saved_lifetime, 20_000_000);
    assert_eq!(p.total_spent_lifetime, 80_000_000);
}

#[test]
fn test_withdraw_only_on_28th() {
    let (env, _admin, _keeper, user, _token, client) = setup_at(TS_15TH);
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
    let (_env, _admin, _keeper, _user, _token, client) = setup_at(TS_28TH);
    assert_eq!(client.current_day_utc(), 28u32);

    let (env2, _, _, _, _, client2) = setup_at(TS_15TH);
    let _ = env2; // unused
    assert_eq!(client2.current_day_utc(), 15u32);
}

const _: u64 = SECONDS_PER_DAY; // silence unused if not referenced

#[test]
fn test_blend_stubs() {
    let (_env, _admin, keeper, _user, _token, client) = setup_at(TS_15TH);
    client.deposit_to_blend(&keeper, &100_000_000);
    client.withdraw_from_blend(&keeper, &50_000_000);
    assert_eq!(client.blend_position(), 0);
}

// ── Role separation ──────────────────────────────────────────────────

#[test]
fn test_fee_recipient_is_distinct_and_not_the_admin() {
    let (_env, admin, _keeper, _user, _token, client) = setup_at(TS_15TH);
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
        env.register(SpendSave, (admin.clone(), Option::<Address>::None, token_addr.clone()));
    let client = SpendSaveClient::new(&env, &contract_id);

    assert!(client.fee_recipient().is_none());
    assert_eq!(client.get_admin().unwrap(), admin);
}

#[test]
fn test_keeper_cannot_call_admin_functions() {
    let (env, _admin, keeper, _user, token, client) = setup_at(TS_15TH);
    let keeper_role = Symbol::new(&env, "keeper");

    assert!(client.try_set_fee_recipient(&keeper, &Some(token)).is_err());
    assert!(client.try_pause(&keeper).is_err());
    assert!(client.try_unpause(&keeper).is_err());
    assert!(client.try_grant_role(&keeper, &keeper, &keeper_role).is_err());
    assert!(client.try_revoke_role(&keeper, &keeper, &keeper_role).is_err());
}

#[test]
fn test_unprivileged_caller_cannot_call_privileged_functions() {
    let (env, admin, _keeper, _user, _token, client) = setup_at(TS_15TH);
    let outsider = Address::generate(&env);
    let keeper_role = Symbol::new(&env, "keeper");

    // Admin functions
    assert!(client.try_set_fee_recipient(&outsider, &Option::<Address>::None).is_err());
    assert!(client.try_pause(&outsider).is_err());
    assert!(client.try_unpause(&outsider).is_err());

    // Keeper functions
    assert!(client.try_deposit_to_blend(&outsider, &1_000_000).is_err());
    assert!(client.try_withdraw_from_blend(&outsider, &1_000_000).is_err());

    // Role-management functions exposed by OZ AccessControl
    assert!(client.try_grant_role(&outsider, &outsider, &keeper_role).is_err());
    assert!(client.try_revoke_role(&outsider, &admin, &keeper_role).is_err());

    // `set_role_admin` and `renounce_admin` take no caller parameter: OZ gates
    // them on the stored admin's own signature. Prove that gate by dropping
    // every authorization instead of naming a caller.
    env.mock_auths(&[]);
    assert!(client.try_set_role_admin(&keeper_role, &keeper_role).is_err());
    assert!(client.try_renounce_admin().is_err());
}

#[test]
fn test_keeper_can_call_keeper_functions() {
    let (_env, _admin, keeper, _user, _token, client) = setup_at(TS_15TH);
    client.deposit_to_blend(&keeper, &1_000_000);
    client.withdraw_from_blend(&keeper, &1_000_000);
}

// ── Pause ────────────────────────────────────────────────────────────

#[test]
fn test_paused_rejects_deposits_and_withdrawals_but_not_reads() {
    let (env, admin, _keeper, user, _token, client) = setup_at(TS_28TH);
    let recipient = Address::generate(&env);
    client.enroll(&user, &2000u32);
    client.spend(&user, &recipient, &100_000_000);

    client.pause(&admin);
    assert!(client.paused());

    // Deposits (enroll + spend, i.e. money in) are rejected while paused.
    assert!(client.try_enroll(&user, &3000u32).is_err());
    assert!(client.try_spend(&user, &recipient, &10_000_000).is_err());

    // Withdrawals are rejected while paused.
    assert!(client.try_withdraw(&user, &10_000_000).is_err());

    // Reads stay callable while paused.
    assert_eq!(client.get_position(&user).saved_balance, 20_000_000);
    assert!(client.is_withdrawal_day_now());

    // Unpausing restores deposits/withdrawals.
    client.unpause(&admin);
    assert!(!client.paused());
    client.spend(&user, &recipient, &10_000_000);
    client.withdraw(&user, &10_000_000);
}

// ── Two-step admin transfer ──────────────────────────────────────────

#[test]
fn test_two_step_admin_transfer() {
    let (env, admin, _keeper, _user, _token, client) = setup_at(TS_15TH);
    let new_admin = Address::generate(&env);

    client.transfer_admin_role(&new_admin, &1000u32);
    assert_eq!(client.get_admin().unwrap(), admin.clone());

    client.accept_admin_transfer();
    assert_eq!(client.get_admin().unwrap(), new_admin.clone());

    // The new admin can now drive config…
    client.set_fee_recipient(&new_admin, &None);

    // …and the previous admin is no longer privileged.
    assert!(client.try_set_fee_recipient(&admin, &None).is_err());
}
