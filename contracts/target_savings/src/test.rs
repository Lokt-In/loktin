#![cfg(test)]
extern crate std;

use super::*;
use mock_pool::{MockPool, MockPoolClient};
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token::StellarAssetClient, token::TokenClient, Env, String, Symbol};

const PERIOD_WEEK: u64 = 604_800;
const ONE_YEAR: u64 = 31_536_000;

// Register a mock pool (10% APY) on the same token and point the contract at it.
fn setup_pool<'a>(
    env: &Env,
    admin: &Address,
    token_addr: &Address,
    client: &TargetSavingsClient,
) -> MockPoolClient<'a> {
    let pool_id = env.register(
        MockPool,
        (admin.clone(), Option::<Address>::None, token_addr.clone(), 1000u32),
    );
    let pool = MockPoolClient::new(env, &pool_id);
    client.set_pool(admin, &pool_id);
    pool
}

// Returns (env, admin, keeper, user, token, client). The keeper address holds the
// `keeper` role and is the only address allowed to call the scheduled functions.
fn setup() -> (Env, Address, Address, Address, Address, TargetSavingsClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);

    let admin = Address::generate(&env);
    let keeper = Address::generate(&env);
    let user = Address::generate(&env);
    let fee_recipient = Address::generate(&env);

    // Stellar Asset Contract for the test token
    let issuer = Address::generate(&env);
    let asset = env.register_stellar_asset_contract_v2(issuer.clone());
    let token_addr = asset.address();
    let token_admin = StellarAssetClient::new(&env, &token_addr);

    // Mint some USDC to the user
    token_admin.mint(&user, &10_000_000_000_i128); // 1000 USDC (7 decimals)

    let contract_id =
        env.register(TargetSavings, (admin.clone(), Some(fee_recipient), token_addr.clone()));
    let client = TargetSavingsClient::new(&env, &contract_id);
    client.grant_role(&admin, &keeper, &Symbol::new(&env, "keeper"));

    (env, admin, keeper, user, token_addr, client)
}

fn create_default_goal(env: &Env, user: &Address, client: &TargetSavingsClient) -> u64 {
    let now = env.ledger().timestamp();
    client.create_target(
        user,
        &String::from_str(env, "Goal"),
        &1_000_000_000,
        &PERIOD_WEEK,
        &10_000_000,
        &(now + 12 * PERIOD_WEEK),
    )
}

#[test]
fn test_create_target() {
    let (env, _admin, _keeper, user, _token, client) = setup();
    let now = env.ledger().timestamp();
    let id = client.create_target(
        &user,
        &String::from_str(&env, "Trip to Japan"),
        &500_000_000_i128, // 50 USDC target
        &PERIOD_WEEK,
        &10_000_000_i128, // 1 USDC per week
        &(now + 12 * PERIOD_WEEK),
    );
    assert_eq!(id, 1);

    let goal = client.get_target(&id);
    assert_eq!(goal.user, user);
    assert_eq!(goal.target_amount, 500_000_000);
    assert_eq!(goal.deposited, 0);
    assert_eq!(goal.is_complete, false);

    let user_goals = client.get_user_goals(&user);
    assert_eq!(user_goals.len(), 1);
}

#[test]
fn test_manual_deposit() {
    let (env, _admin, _keeper, user, _token, client) = setup();
    let id = create_default_goal(&env, &user, &client);

    client.manual_deposit(&user, &id, &50_000_000); // 5 USDC
    let goal = client.get_target(&id);
    assert_eq!(goal.deposited, 50_000_000);
}

#[test]
fn test_early_withdrawal_charges_forfeit() {
    let (env, _admin, _keeper, user, _token, client) = setup();
    let id = create_default_goal(&env, &user, &client);

    client.manual_deposit(&user, &id, &100_000_000); // 10 USDC

    // Withdraw early — should charge 1% (1 USDC = 1_000_000)
    let withdrawn = client.withdraw(&user, &id);
    assert_eq!(withdrawn, 99_000_000); // 9.9 USDC back

    let goal = client.get_target(&id);
    assert_eq!(goal.is_complete, true);
    assert_eq!(goal.deposited, 0);

    // The forfeit goes to the configured fee recipient, not the admin.
    let recipient = client.fee_recipient().expect("fee recipient configured");
    let token_client = TokenClient::new(&env, &client.usdc_token());
    assert_eq!(token_client.balance(&recipient), 1_000_000); // 0.1 USDC
}

#[test]
fn test_full_term_withdrawal_no_forfeit() {
    let (env, _admin, _keeper, user, _token, client) = setup();
    let now = env.ledger().timestamp();
    let end = now + 4 * PERIOD_WEEK;
    let id = client.create_target(
        &user,
        &String::from_str(&env, "Goal"),
        &1_000_000_000,
        &PERIOD_WEEK,
        &10_000_000,
        &end,
    );

    client.manual_deposit(&user, &id, &100_000_000);

    // Advance ledger past end_date
    env.ledger().set_timestamp(end + 1);

    let withdrawn = client.withdraw(&user, &id);
    assert_eq!(withdrawn, 100_000_000); // Full amount, no forfeit
}

#[test]
fn test_blend_position_zero_when_pool_unset() {
    let (_env, _admin, keeper, _user, _token, client) = setup();
    assert_eq!(client.blend_position(), 0);
    assert!(client.try_deposit_to_blend(&keeper, &100_000_000).is_err());
}

#[test]
fn test_blend_deposit_accrues_and_withdraws() {
    let (env, admin, keeper, user, token_addr, client) = setup();
    let _pool = setup_pool(&env, &admin, &token_addr, &client);

    // User funds a goal so the contract holds idle USDC.
    let id = create_default_goal(&env, &user, &client);
    client.manual_deposit(&user, &id, &1_000_000_000); // 100 USDC

    // Keeper sweeps idle USDC into the pool.
    client.deposit_to_blend(&keeper, &1_000_000_000);
    assert_eq!(client.blend_position(), 1_000_000_000); // 100 USDC

    // A year passes → 10% yield accrues.
    let t = env.ledger().timestamp();
    env.ledger().set_timestamp(t + ONE_YEAR);
    assert_eq!(client.blend_position(), 1_100_000_000); // 110 USDC

    // Keeper pulls 40 USDC back into the contract.
    client.withdraw_from_blend(&keeper, &400_000_000);
    assert_eq!(client.blend_position(), 700_000_000); // 70 USDC left
}

#[test]
fn test_per_goal_yield_accrues_and_pays() {
    let (env, admin, keeper, user, token_addr, client) = setup();
    let pool = setup_pool(&env, &admin, &token_addr, &client);

    // Fund the pool reserve so it can actually pay out yield.
    let token_admin = StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&admin, &1_000_000_000);
    pool.fund_reserve(&admin, &1_000_000_000); // 100 USDC

    // Goal ends in 50 weeks; deposit 100 USDC and sweep it into the pool.
    let now = env.ledger().timestamp();
    let id = client.create_target(
        &user,
        &String::from_str(&env, "Japan"),
        &1_000_000_000,
        &PERIOD_WEEK,
        &10_000_000,
        &(now + 50 * PERIOD_WEEK),
    );
    client.manual_deposit(&user, &id, &1_000_000_000); // 100 USDC
    client.deposit_to_blend(&keeper, &1_000_000_000);

    // One year on, this specific goal shows ~10 USDC of interest (10% of 100).
    env.ledger().set_timestamp(now + ONE_YEAR);
    assert_eq!(client.get_goal_yield(&id), 100_000_000); // 10 USDC

    // Past end_date (50wk < ~52wk) → no forfeit. Withdraw pays principal + yield.
    let token = TokenClient::new(&env, &token_addr);
    let before = token.balance(&user);
    let out = client.withdraw(&user, &id);
    assert_eq!(out, 1_100_000_000); // 110 USDC
    assert_eq!(token.balance(&user) - before, 1_100_000_000);
}

#[test]
fn test_process_period_pulls_deposit_with_allowance() {
    let (env, _admin, keeper, user, token_addr, client) = setup();
    let now = env.ledger().timestamp();
    let id = client.create_target(
        &user,
        &String::from_str(&env, "Goal"),
        &1_000_000_000,
        &PERIOD_WEEK,
        &10_000_000, // 1 USDC per week
        &(now + 12 * PERIOD_WEEK),
    );

    // User approves the contract to debit USDC (covers the periodic transfer_from).
    let token = TokenClient::new(&env, &token_addr);
    token.approve(&user, &client.address, &100_000_000, &1_000_000);

    // Advance to the first due period and let the keeper pull the deposit.
    env.ledger().set_timestamp(now + PERIOD_WEEK);
    client.process_period(&keeper, &id);

    let goal = client.get_target(&id);
    assert_eq!(goal.deposited, 10_000_000); // pulled 1 USDC
    assert_eq!(goal.missed_periods, 0);
    // Not due again immediately.
    assert!(client.try_process_period(&keeper, &id).is_err());
}

#[test]
fn test_process_period_missed_without_allowance() {
    let (env, _admin, keeper, user, _token, client) = setup();
    let id = create_default_goal(&env, &user, &client);

    // No approval → keeper records a missed period instead of failing.
    let now = env.ledger().timestamp();
    env.ledger().set_timestamp(now + PERIOD_WEEK);
    client.process_period(&keeper, &id);

    let goal = client.get_target(&id);
    assert_eq!(goal.deposited, 0);
    assert_eq!(goal.missed_periods, 1);
}

#[test]
fn test_process_period_not_due_fails() {
    let (env, _admin, keeper, user, _token, client) = setup();
    let id = create_default_goal(&env, &user, &client);
    // First period isn't due yet.
    assert!(client.try_process_period(&keeper, &id).is_err());
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
        env.register(TargetSavings, (admin.clone(), Option::<Address>::None, token_addr.clone()));
    let client = TargetSavingsClient::new(&env, &contract_id);

    assert!(client.fee_recipient().is_none());
    assert_eq!(client.get_admin(), Some(admin));
}

#[test]
fn test_keeper_cannot_call_admin_functions() {
    let (env, _admin, keeper, _user, token, client) = setup();
    let keeper_role = Symbol::new(&env, "keeper");

    assert!(client.try_set_pool(&keeper, &token).is_err());
    assert!(client.try_set_yield_apy(&keeper, &2000u32).is_err());
    assert!(client.try_set_fee_recipient(&keeper, &Some(token)).is_err());
    assert!(client.try_pause(&keeper).is_err());
    assert!(client.try_unpause(&keeper).is_err());
    assert!(client.try_grant_role(&keeper, &keeper, &keeper_role).is_err());
    assert!(client.try_revoke_role(&keeper, &keeper, &keeper_role).is_err());
}

#[test]
fn test_unprivileged_caller_cannot_call_privileged_functions() {
    let (env, admin, _keeper, user, _token, client) = setup();
    let outsider = Address::generate(&env);
    let id = create_default_goal(&env, &user, &client);
    let keeper_role = Symbol::new(&env, "keeper");

    // Admin functions
    assert!(client.try_set_pool(&outsider, &admin).is_err());
    assert!(client.try_set_yield_apy(&outsider, &2000u32).is_err());
    assert!(client.try_set_fee_recipient(&outsider, &Option::<Address>::None).is_err());
    assert!(client.try_pause(&outsider).is_err());
    assert!(client.try_unpause(&outsider).is_err());

    // Keeper functions
    assert!(client.try_process_period(&outsider, &id).is_err());
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
    let (env, admin, keeper, user, token_addr, client) = setup();
    let _pool = setup_pool(&env, &admin, &token_addr, &client);

    let now = env.ledger().timestamp();
    let id = client.create_target(
        &user,
        &String::from_str(&env, "Goal"),
        &1_000_000_000,
        &PERIOD_WEEK,
        &10_000_000,
        &(now + 12 * PERIOD_WEEK),
    );
    let token = TokenClient::new(&env, &token_addr);
    token.approve(&user, &client.address, &100_000_000, &1_000_000);

    env.ledger().set_timestamp(now + PERIOD_WEEK);
    client.process_period(&keeper, &id);
    assert_eq!(client.get_target(&id).deposited, 10_000_000);

    client.deposit_to_blend(&keeper, &10_000_000);
    assert_eq!(client.blend_position(), 10_000_000);
    client.withdraw_from_blend(&keeper, &5_000_000);
    assert_eq!(client.blend_position(), 5_000_000);
}

// ── Pause ────────────────────────────────────────────────────────────

#[test]
fn test_paused_rejects_deposits_and_withdrawals_but_not_reads() {
    let (env, admin, _keeper, user, _token, client) = setup();
    let id = create_default_goal(&env, &user, &client);
    client.manual_deposit(&user, &id, &100_000_000);

    client.pause(&admin);
    assert!(client.paused());

    // Deposits (new goal + top-up) are rejected while paused.
    assert!(client
        .try_create_target(
            &user,
            &String::from_str(&env, "Blocked"),
            &1_000_000_000,
            &PERIOD_WEEK,
            &10_000_000,
            &(env.ledger().timestamp() + 12 * PERIOD_WEEK),
        )
        .is_err());
    assert!(client.try_manual_deposit(&user, &id, &10_000_000).is_err());

    // Withdrawals are rejected while paused.
    assert!(client.try_withdraw(&user, &id).is_err());

    // Reads stay callable while paused.
    assert_eq!(client.get_target(&id).deposited, 100_000_000);

    // Unpausing restores deposits/withdrawals.
    client.unpause(&admin);
    assert!(!client.paused());
    client.manual_deposit(&user, &id, &10_000_000);
}

// ── Two-step admin transfer ──────────────────────────────────────────

#[test]
fn test_two_step_admin_transfer() {
    let (env, admin, _keeper, _user, _token, client) = setup();
    let new_admin = Address::generate(&env);

    client.transfer_admin_role(&new_admin, &1000u32);
    assert_eq!(client.get_admin(), Some(admin.clone()));

    client.accept_admin_transfer();
    assert_eq!(client.get_admin(), Some(new_admin.clone()));

    // The new admin can now drive config…
    client.set_yield_apy(&new_admin, &500u32);
    assert_eq!(client.yield_apy_bps(), 500);

    // …and the previous admin is no longer privileged.
    assert!(client.try_set_yield_apy(&admin, &600u32).is_err());
}
