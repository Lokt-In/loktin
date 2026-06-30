#![cfg(test)]
extern crate std;

use super::*;
use mock_pool::{MockPool, MockPoolClient};
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token::StellarAssetClient, Env, String};

const PERIOD_WEEK: u64 = 604_800;
const ONE_YEAR: u64 = 31_536_000;

// Register a mock pool (10% APY) on the same token and point the contract at it.
fn setup_pool<'a>(
    env: &Env,
    admin: &Address,
    token_addr: &Address,
    client: &TargetSavingsClient,
) -> MockPoolClient<'a> {
    let pool_id = env.register(MockPool, (admin.clone(), token_addr.clone(), 1000u32));
    let pool = MockPoolClient::new(env, &pool_id);
    client.set_pool(&pool_id);
    pool
}

fn setup() -> (Env, Address, Address, Address, TargetSavingsClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    // Stellar Asset Contract for the test token
    let issuer = Address::generate(&env);
    let asset = env.register_stellar_asset_contract_v2(issuer.clone());
    let token_addr = asset.address();
    let token_admin = StellarAssetClient::new(&env, &token_addr);

    // Mint some USDC to the user
    token_admin.mint(&user, &10_000_000_000_i128); // 1000 USDC (7 decimals)

    let contract_id = env.register(TargetSavings, (admin.clone(), token_addr.clone()));
    let client = TargetSavingsClient::new(&env, &contract_id);

    (env, admin, user, token_addr, client)
}

#[test]
fn test_create_target() {
    let (env, _admin, user, _token, client) = setup();
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
    let (env, _admin, user, _token, client) = setup();
    let now = env.ledger().timestamp();
    let id = client.create_target(
        &user,
        &String::from_str(&env, "Goal"),
        &500_000_000,
        &PERIOD_WEEK,
        &10_000_000,
        &(now + 4 * PERIOD_WEEK),
    );

    client.manual_deposit(&user, &id, &50_000_000); // 5 USDC
    let goal = client.get_target(&id);
    assert_eq!(goal.deposited, 50_000_000);
}

#[test]
fn test_early_withdrawal_charges_forfeit() {
    let (env, admin, user, _token, client) = setup();
    let now = env.ledger().timestamp();
    let id = client.create_target(
        &user,
        &String::from_str(&env, "Goal"),
        &1_000_000_000,
        &PERIOD_WEEK,
        &10_000_000,
        &(now + 4 * PERIOD_WEEK),
    );

    client.manual_deposit(&user, &id, &100_000_000); // 10 USDC

    // Withdraw early — should charge 1% (1 USDC = 1_000_000)
    let withdrawn = client.withdraw(&user, &id);
    assert_eq!(withdrawn, 99_000_000); // 9.9 USDC back

    let goal = client.get_target(&id);
    assert_eq!(goal.is_complete, true);
    assert_eq!(goal.deposited, 0);

    // Verify fee recipient (admin) got the forfeit
    let token_client = soroban_sdk::token::TokenClient::new(&env, &client.usdc_token());
    assert_eq!(token_client.balance(&admin), 1_000_000); // 0.1 USDC
}

#[test]
fn test_full_term_withdrawal_no_forfeit() {
    let (env, _admin, user, _token, client) = setup();
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
    let (_env, _admin, _user, _token, client) = setup();
    assert_eq!(client.blend_position(), 0);
    assert!(client.try_deposit_to_blend(&100_000_000).is_err());
}

#[test]
fn test_blend_deposit_accrues_and_withdraws() {
    let (env, admin, user, token_addr, client) = setup();
    let _pool = setup_pool(&env, &admin, &token_addr, &client);

    // User funds a goal so the contract holds idle USDC.
    let now = env.ledger().timestamp();
    let id = client.create_target(
        &user,
        &String::from_str(&env, "Goal"),
        &1_000_000_000,
        &PERIOD_WEEK,
        &10_000_000,
        &(now + 12 * PERIOD_WEEK),
    );
    client.manual_deposit(&user, &id, &1_000_000_000); // 100 USDC

    // Keeper sweeps idle USDC into the pool.
    client.deposit_to_blend(&1_000_000_000);
    assert_eq!(client.blend_position(), 1_000_000_000); // 100 USDC

    // A year passes → 10% yield accrues.
    let t = env.ledger().timestamp();
    env.ledger().set_timestamp(t + ONE_YEAR);
    assert_eq!(client.blend_position(), 1_100_000_000); // 110 USDC

    // Keeper pulls 40 USDC back into the contract.
    client.withdraw_from_blend(&400_000_000);
    assert_eq!(client.blend_position(), 700_000_000); // 70 USDC left
}

#[test]
fn test_per_goal_yield_accrues_and_pays() {
    let (env, admin, user, token_addr, client) = setup();
    let pool = setup_pool(&env, &admin, &token_addr, &client);

    // Fund the pool reserve so it can actually pay out yield.
    let token_admin = StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&admin, &1_000_000_000);
    pool.fund_reserve(&1_000_000_000); // 100 USDC

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
    client.deposit_to_blend(&1_000_000_000);

    // One year on, this specific goal shows ~10 USDC of interest (10% of 100).
    env.ledger().set_timestamp(now + ONE_YEAR);
    assert_eq!(client.get_goal_yield(&id), 100_000_000); // 10 USDC

    // Past end_date (50wk < ~52wk) → no forfeit. Withdraw pays principal + yield.
    let token = soroban_sdk::token::TokenClient::new(&env, &token_addr);
    let before = token.balance(&user);
    let out = client.withdraw(&user, &id);
    assert_eq!(out, 1_100_000_000); // 110 USDC
    assert_eq!(token.balance(&user) - before, 1_100_000_000);
}

#[test]
fn test_process_period_pulls_deposit_with_allowance() {
    let (env, _admin, user, token_addr, client) = setup();
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
    let token = soroban_sdk::token::TokenClient::new(&env, &token_addr);
    token.approve(&user, &client.address, &100_000_000, &1_000_000);

    // Advance to the first due period and let the keeper pull the deposit.
    env.ledger().set_timestamp(now + PERIOD_WEEK);
    client.process_period(&id);

    let goal = client.get_target(&id);
    assert_eq!(goal.deposited, 10_000_000); // pulled 1 USDC
    assert_eq!(goal.missed_periods, 0);
    // Not due again immediately.
    assert!(client.try_process_period(&id).is_err());
}

#[test]
fn test_process_period_missed_without_allowance() {
    let (env, _admin, user, _token, client) = setup();
    let now = env.ledger().timestamp();
    let id = client.create_target(
        &user,
        &String::from_str(&env, "Goal"),
        &1_000_000_000,
        &PERIOD_WEEK,
        &10_000_000,
        &(now + 12 * PERIOD_WEEK),
    );

    // No approval → keeper records a missed period instead of failing.
    env.ledger().set_timestamp(now + PERIOD_WEEK);
    client.process_period(&id);

    let goal = client.get_target(&id);
    assert_eq!(goal.deposited, 0);
    assert_eq!(goal.missed_periods, 1);
}

#[test]
fn test_process_period_not_due_fails() {
    let (env, _admin, user, _token, client) = setup();
    let now = env.ledger().timestamp();
    let id = client.create_target(
        &user,
        &String::from_str(&env, "Goal"),
        &1_000_000_000,
        &PERIOD_WEEK,
        &10_000_000,
        &(now + 12 * PERIOD_WEEK),
    );
    // First period isn't due yet.
    assert!(client.try_process_period(&id).is_err());
}
