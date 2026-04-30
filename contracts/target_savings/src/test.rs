#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token::StellarAssetClient, Env, String};

const PERIOD_WEEK: u64 = 604_800;

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
fn test_blend_stubs_emit_events() {
    let (_env, _admin, _user, _token, client) = setup();
    // These should succeed and not panic
    client.deposit_to_blend(&100_000_000);
    client.withdraw_from_blend(&50_000_000);
    assert_eq!(client.blend_position(), 0);
}
