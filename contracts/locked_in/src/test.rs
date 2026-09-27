#![cfg(test)]
extern crate std;

use super::*;
use mock_pool::{MockPool, MockPoolClient};
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token::StellarAssetClient, Env, Symbol};

const ONE_YEAR: u64 = 31_536_000;

// Register a mock pool (10% APY) on the same token and point the contract at it.
fn setup_pool<'a>(
    env: &Env,
    admin: &Address,
    token_addr: &Address,
    client: &LockedInClient,
) -> MockPoolClient<'a> {
    let pool_id = env.register(
        MockPool,
        (admin.clone(), Option::<Address>::None, token_addr.clone(), 1000u32),
    );
    let pool = MockPoolClient::new(env, &pool_id);
    client.set_pool(admin, &pool_id);
    pool
}

// Returns (env, admin, keeper, user, token, client). The keeper address has the
// `keeper` role granted and is the only address allowed to call the blend sweeps.
fn setup() -> (Env, Address, Address, Address, Address, LockedInClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);

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
        env.register(LockedIn, (admin.clone(), Some(fee_recipient), token_addr.clone()));
    let client = LockedInClient::new(&env, &contract_id);
    client.grant_role(&admin, &keeper, &Symbol::new(&env, "keeper"));

    (env, admin, keeper, user, token_addr, client)
}

#[test]
fn test_default_apy_tiers() {
    let (_env, _admin, _keeper, _user, _token, client) = setup();
    let tiers = client.get_apy_tiers();
    assert_eq!(tiers.get(1), Some(400));
    assert_eq!(tiers.get(3), Some(600));
    assert_eq!(tiers.get(6), Some(800));
    assert_eq!(tiers.get(12), Some(1000));
}

#[test]
fn test_lock_computes_projected_yield() {
    let (_env, _admin, _keeper, user, _token, client) = setup();
    // Lock 100 USDC for 12 months at 10% APY
    let amount = 1_000_000_000_i128; // 100 USDC
    let id = client.lock(&user, &amount, &12u32);
    assert_eq!(id, 1);

    let lock = client.get_lock(&id);
    assert_eq!(lock.amount, amount);
    assert_eq!(lock.apy_basis_points, 1000);
    assert!(lock.projected_yield > 95_000_000); // ~9.5 USDC
    assert!(lock.projected_yield < 105_000_000); // ~10.5 USDC
}

#[test]
fn test_unlock_before_maturity_fails() {
    let (_env, _admin, _keeper, user, _token, client) = setup();
    let id = client.lock(&user, &1_000_000_000, &3u32);
    let result = client.try_unlock(&user, &id);
    assert!(result.is_err());
}

#[test]
fn test_unlock_after_maturity_returns_principal() {
    let (env, _admin, _keeper, user, _token, client) = setup();
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
    let (_env, admin, _keeper, _user, _token, client) = setup();
    client.set_apy_tier(&admin, &3u32, &750u32);
    assert_eq!(client.get_apy_for_duration(&3u32), 750);
}

#[test]
fn test_blend_position_zero_when_pool_unset() {
    let (_env, _admin, keeper, _user, _token, client) = setup();
    // No pool configured yet → position reads 0, deposit errors.
    assert_eq!(client.blend_position(), 0);
    assert!(client.try_deposit_to_blend(&keeper, &100_000_000).is_err());
}

#[test]
fn test_blend_deposit_accrues_and_withdraws() {
    let (env, admin, keeper, user, token_addr, client) = setup();
    let _pool = setup_pool(&env, &admin, &token_addr, &client);

    // User locks 100 USDC → contract holds it idle.
    let amount = 1_000_000_000_i128;
    client.lock(&user, &amount, &12u32);

    // Keeper sweeps idle USDC into the pool.
    client.deposit_to_blend(&keeper, &amount);
    assert_eq!(client.blend_position(), amount); // 100 USDC, no time elapsed

    // A year passes → 10% yield accrues in the pool.
    let now = env.ledger().timestamp();
    env.ledger().set_timestamp(now + ONE_YEAR);
    assert_eq!(client.blend_position(), 1_100_000_000); // 110 USDC

    // Keeper pulls 40 USDC back into the contract.
    client.withdraw_from_blend(&keeper, &400_000_000);
    assert_eq!(client.blend_position(), 700_000_000); // 110 - 40 = 70 USDC left
}

#[test]
fn test_unlock_pays_principal_plus_yield_from_pool() {
    let (env, admin, keeper, user, token_addr, client) = setup();
    let pool = setup_pool(&env, &admin, &token_addr, &client);

    // Fund the pool's yield reserve so it can pay out more than principal.
    let token_admin = StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&admin, &1_000_000_000); // 100 USDC
    pool.fund_reserve(&admin, &1_000_000_000);

    // User locks 100 USDC for 12 months; keeper sweeps it all into the pool.
    let amount = 1_000_000_000_i128;
    let id = client.lock(&user, &amount, &12u32);
    let lock = client.get_lock(&id);
    client.deposit_to_blend(&keeper, &amount); // contract now holds 0 idle USDC

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

// ── Role separation ──────────────────────────────────────────────────

#[test]
fn test_fee_recipient_is_distinct_and_not_the_admin() {
    let (_env, admin, _keeper, _user, _token, client) = setup();
    let recipient = client.fee_recipient().expect("fee recipient set at construction");
    assert_ne!(recipient, admin);
    assert_eq!(client.get_admin(), Some(admin));
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
        env.register(LockedIn, (admin.clone(), Option::<Address>::None, token_addr.clone()));
    let client = LockedInClient::new(&env, &contract_id);

    assert!(client.fee_recipient().is_none());
    assert_eq!(client.get_admin(), Some(admin));
}

#[test]
fn test_keeper_cannot_call_admin_functions() {
    let (env, _admin, keeper, _user, token, client) = setup();
    let keeper_role = Symbol::new(&env, "keeper");

    // Config / role-grant / pause: a keeper key must be rejected from all of them.
    assert!(client.try_set_apy_tier(&keeper, &3u32, &750u32).is_err());
    assert!(client.try_set_pool(&keeper, &token).is_err());
    assert!(client.try_set_fee_recipient(&keeper, &Some(token)).is_err());
    assert!(client.try_pause(&keeper).is_err());
    assert!(client.try_unpause(&keeper).is_err());
    assert!(client.try_grant_role(&keeper, &keeper, &keeper_role).is_err());
    assert!(client.try_revoke_role(&keeper, &keeper, &keeper_role).is_err());
}

#[test]
fn test_unprivileged_caller_cannot_call_privileged_functions() {
    let (env, admin, _keeper, _user, _token, client) = setup();
    let outsider = Address::generate(&env);

    // Admin functions
    assert!(client.try_set_apy_tier(&outsider, &3u32, &750u32).is_err());
    assert!(client.try_set_pool(&outsider, &admin).is_err());
    assert!(client.try_set_fee_recipient(&outsider, &Option::<Address>::None).is_err());
    assert!(client.try_pause(&outsider).is_err());
    assert!(client.try_unpause(&outsider).is_err());

    // Keeper functions
    assert!(client.try_deposit_to_blend(&outsider, &1_000_000).is_err());
    assert!(client.try_withdraw_from_blend(&outsider, &1_000_000).is_err());

    // Role-management functions exposed by OZ AccessControl
    let keeper_role = Symbol::new(&env, "keeper");
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
    let (env, admin, keeper, user, token_addr, client) = setup();
    let _pool = setup_pool(&env, &admin, &token_addr, &client);

    client.lock(&user, &1_000_000_000, &12u32);
    client.deposit_to_blend(&keeper, &1_000_000_000);
    assert_eq!(client.blend_position(), 1_000_000_000);
    client.withdraw_from_blend(&keeper, &100_000_000);
    assert_eq!(client.blend_position(), 900_000_000);
}

// ── Pause ────────────────────────────────────────────────────────────

#[test]
fn test_paused_rejects_deposits_and_withdrawals_but_not_reads() {
    let (env, admin, _keeper, user, _token, client) = setup();

    // Open a position before pausing so the withdrawal path is exercisable.
    let id = client.lock(&user, &1_000_000_000, &3u32);

    client.pause(&admin);
    assert!(client.paused());

    // Deposits are rejected while paused.
    assert!(client.try_lock(&user, &1_000_000_000, &3u32).is_err());

    // Withdrawals are rejected while paused, even after maturity.
    let lock = client.get_lock(&id);
    env.ledger().set_timestamp(lock.end_date + 1);
    assert!(client.try_unlock(&user, &id).is_err());

    // Reads stay callable while paused.
    assert_eq!(client.get_apy_for_duration(&3u32), 600);
    assert_eq!(client.get_lock(&id).amount, 1_000_000_000);

    // Unpausing restores deposits/withdrawals.
    client.unpause(&admin);
    assert!(!client.paused());
    client.lock(&user, &1_000_000_000, &3u32);
}

// ── Two-step admin transfer ──────────────────────────────────────────

#[test]
fn test_two_step_admin_transfer() {
    let (env, admin, _keeper, _user, _token, client) = setup();
    let new_admin = Address::generate(&env);

    // Step 1: current admin proposes the transfer.
    client.transfer_admin_role(&new_admin, &1000u32);
    // Not applied until accepted.
    assert_eq!(client.get_admin(), Some(admin.clone()));

    // Step 2: the proposed admin accepts.
    client.accept_admin_transfer();
    assert_eq!(client.get_admin(), Some(new_admin.clone()));

    // The new admin can now drive config…
    client.set_apy_tier(&new_admin, &2u32, &500u32);
    assert_eq!(client.get_apy_for_duration(&2u32), 500);

    // …and the previous admin is no longer privileged.
    assert!(client.try_set_apy_tier(&admin, &2u32, &600u32).is_err());
}
