#![cfg(test)]
extern crate std;

use super::*;
use loktin_yield::assets_for_shares;
use mock_pool::{MockPool, MockPoolClient};
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::token::{StellarAssetClient, TokenClient};

const ONE_YEAR: u64 = 31_536_000;
const USDC: i128 = 10_000_000; // 7 decimals

// ── Shared test harness ──────────────────────────────────────────────
// Mirrors the helpers requested in #36 (fund N users, control ledger time,
// assert the vault can cover every outstanding claim) so this contract's
// multi-user regression tests can be written now. When #36 lands these move
// into the shared crate unchanged.

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

// Create a fresh funded user. The #36 harness's "mint to N users" helper.
fn funded_user(env: &Env, token_addr: &Address, amount: i128) -> Address {
    let user = Address::generate(env);
    StellarAssetClient::new(env, token_addr).mint(&user, &amount);
    user
}

// The property from #36: what the vault holds must cover every outstanding
// lock's current redemption value.
fn assert_solvent(client: &LockedInClient, locks: &[u64]) {
    let total_shares = client.total_shares();
    let total_assets = client.total_assets();
    let mut claims = 0_i128;
    for id in locks {
        let lock = client.get_lock(id);
        if !lock.is_unlocked {
            claims += assets_for_shares(lock.shares, total_shares, total_assets);
        }
    }
    assert!(total_assets >= claims, "vault {} cannot cover claims {}", total_assets, claims);
}

// ── Config / APY ─────────────────────────────────────────────────────

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
fn test_admin_can_change_apy_tier() {
    let (_env, _admin, _user, _token, client) = setup();
    client.set_apy_tier(&3u32, &750u32);
    assert_eq!(client.get_apy_for_duration(&3u32), 750);
}

// ── Duration validation ──────────────────────────────────────────────

#[test]
fn test_invalid_duration_fires_for_zero_and_sixty_one() {
    let (_env, _admin, user, _token, client) = setup();
    // The range check runs before the tier lookup, so these report
    // `InvalidDuration` rather than the misleading `DurationTierMissing`.
    assert_eq!(client.try_lock(&user, &(100 * USDC), &0u32), Err(Ok(Error::InvalidDuration)));
    assert_eq!(client.try_lock(&user, &(100 * USDC), &61u32), Err(Ok(Error::InvalidDuration)));
}

// ── Lock accounting ──────────────────────────────────────────────────

#[test]
fn test_lock_ids_are_one_indexed() {
    let (_env, _admin, user, _token, client) = setup();
    assert_eq!(client.lock(&user, &(100 * USDC), &12u32), 1);
    assert_eq!(client.lock(&user, &(100 * USDC), &3u32), 2);
}

#[test]
fn test_lock_records_shares_and_display_estimate() {
    let (_env, _admin, user, _token, client) = setup();
    let amount = 100 * USDC;
    let id = client.lock(&user, &amount, &12u32);

    let lock = client.get_lock(&id);
    assert_eq!(lock.amount, amount);
    assert_eq!(lock.shares, amount); // empty vault mints 1:1
    assert_eq!(lock.apy_basis_points, 1000);
    // 12 months is now exactly 365 days, so the "10% APY" estimate is a true 10%.
    assert_eq!(lock.projected_yield, 10 * USDC);
    assert_eq!(client.total_shares(), amount);
    assert_eq!(client.total_assets(), amount);
}

#[test]
fn test_zero_share_mint_is_rejected() {
    let (env, admin, user, token_addr, client) = setup();
    let pool = setup_pool(&env, &admin, &token_addr, &client);

    // A locks 100 and the keeper puts it to work. A year passes, the pool
    // earns 10%, so the vault is worth 110 and one share costs ~1.1 USDC.
    let amount = 100 * USDC;
    client.lock(&user, &amount, &12u32);
    client.deposit_to_blend(&amount);
    env.ledger().set_timestamp(env.ledger().timestamp() + ONE_YEAR);
    assert_eq!(client.total_assets(), 110 * USDC);

    // B tries to lock 1 stroop. That buys 0 shares and would hand the vault
    // money for nothing, so it must be rejected before any transfer happens.
    let bob = funded_user(&env, &token_addr, USDC);
    let token = TokenClient::new(&env, &token_addr);
    let before = token.balance(&bob);
    assert_eq!(client.try_lock(&bob, &1_i128, &12u32), Err(Ok(Error::ZeroShares)));
    assert_eq!(token.balance(&bob), before);
    assert_eq!(client.get_user_locks(&bob).len(), 0);

    // The smallest deposit that does buy a whole share is accepted.
    let id = client.lock(&bob, &2_i128, &12u32);
    assert!(client.get_lock(&id).shares > 0);
    assert!(client.total_shares() > amount);
}

// ── Maturity / payout ────────────────────────────────────────────────

#[test]
fn test_unlock_before_maturity_fails() {
    let (_env, _admin, user, _token, client) = setup();
    let id = client.lock(&user, &(100 * USDC), &3u32);
    let result = client.try_unlock(&user, &id);
    assert!(result.is_err());
}

#[test]
fn test_unlock_without_a_pool_returns_exactly_the_principal() {
    let (env, _admin, user, _token, client) = setup();
    let amount = 500 * USDC;
    let id = client.lock(&user, &amount, &1u32);
    let lock = client.get_lock(&id);

    env.ledger().set_timestamp(lock.end_date + 1);
    let payout = client.unlock(&user, &id);

    // No pool, no yield: the shares are worth exactly what was paid for them,
    // not `amount + projected_yield`.
    assert_eq!(payout, amount);
    assert!(client.get_lock(&id).is_unlocked);
    assert_eq!(client.total_shares(), 0);
    assert_eq!(client.total_assets(), 0);
}

#[test]
fn test_unlock_pays_real_pool_yield() {
    let (env, admin, user, token_addr, client) = setup();
    let pool = setup_pool(&env, &admin, &token_addr, &client);
    let amount = 100 * USDC;

    let id = client.lock(&user, &amount, &12u32);
    let lock = client.get_lock(&id);
    client.deposit_to_blend(&amount); // contract now holds 0 idle USDC

    // Fund the pool's reserve so its 10% APY is real money, then wait a year.
    StellarAssetClient::new(&env, &token_addr).mint(&admin, &(10 * USDC));
    pool.fund_reserve(&(10 * USDC));
    env.ledger().set_timestamp(lock.end_date + 1);

    let token = TokenClient::new(&env, &token_addr);
    let before = token.balance(&user);
    let payout = client.unlock(&user, &id);

    // The payout is what the shares redeem for (110), sourced from the pool —
    // not a projected figure paid out of the pooled balance.
    assert_eq!(payout, 110 * USDC);
    assert_eq!(token.balance(&user) - before, 110 * USDC);
    assert_eq!(client.total_assets(), 0);
    assert_eq!(client.total_shares(), 0);
}

#[test]
fn test_user_cannot_withdraw_more_than_shares_redeem_for() {
    let (env, admin, user, token_addr, client) = setup();
    let _pool = setup_pool(&env, &admin, &token_addr, &client);
    let amount = 100 * USDC;

    // The 3-month tier advertises 6% APY, so projected_yield is non-zero...
    let id = client.lock(&user, &amount, &3u32);
    let lock = client.get_lock(&id);
    assert!(lock.projected_yield > 0);

    // ...but nothing was ever supplied to the pool, so nothing was earned.
    env.ledger().set_timestamp(lock.end_date + 1);
    let payout = client.unlock(&user, &id);

    // The payout is only what the shares are actually worth, never the promise.
    assert_eq!(payout, amount);
    assert!(payout < amount + lock.projected_yield);
}

// ── Multi-user regression (#40) ──────────────────────────────────────

#[test]
fn test_two_users_no_pool_both_withdraw_in_full() {
    let (env, _admin, alice, token_addr, client) = setup();
    let bob = funded_user(&env, &token_addr, 1000 * USDC);
    let amount = 100 * USDC;

    let a = client.lock(&alice, &amount, &1u32);
    let b = client.lock(&bob, &amount, &1u32);
    assert_eq!(client.total_shares(), 2 * amount);
    assert_eq!(client.total_assets(), 2 * amount);
    assert_solvent(&client, &[a, b]);

    let end = client.get_lock(&a).end_date;
    env.ledger().set_timestamp(end + 1);

    // With no pool there is no yield behind either lock, so each user withdraws
    // exactly their principal. The first withdrawal cannot dip into the
    // second user's money (the old code paid `amount + projected_yield`).
    assert_eq!(client.unlock(&alice, &a), amount);
    assert_solvent(&client, &[b]);
    assert_eq!(client.unlock(&bob, &b), amount);

    assert_eq!(client.total_assets(), 0);
    assert_eq!(client.total_shares(), 0);
}

#[test]
fn test_pool_yield_splits_evenly_and_vault_is_never_short() {
    let (env, admin, alice, token_addr, client) = setup();
    let pool = setup_pool(&env, &admin, &token_addr, &client);
    let bob = funded_user(&env, &token_addr, 1000 * USDC);
    let amount = 100 * USDC;

    let a = client.lock(&alice, &amount, &12u32);
    let b = client.lock(&bob, &amount, &12u32);
    assert_eq!(client.total_shares(), 2 * amount);
    assert_solvent(&client, &[a, b]);

    // Keeper puts the whole 200 USDC to work; the pool earns 10% over the year,
    // with its reserve funded so the yield is real rather than phantom.
    client.deposit_to_blend(&(2 * amount));
    StellarAssetClient::new(&env, &token_addr).mint(&admin, &(20 * USDC));
    pool.fund_reserve(&(20 * USDC));

    let end = client.get_lock(&a).end_date;
    env.ledger().set_timestamp(end + 1);
    assert_eq!(client.total_assets(), 220 * USDC);

    // Each holds half the shares, so each redeems half of the real 20 USDC gain.
    assert_eq!(client.unlock(&alice, &a), 110 * USDC);
    assert_solvent(&client, &[b]);
    assert_eq!(client.unlock(&bob, &b), 110 * USDC);

    assert_eq!(client.total_assets(), 0);
    assert_eq!(client.total_shares(), 0);
}

// ── Blend integration ────────────────────────────────────────────────

#[test]
fn test_blend_position_zero_when_pool_unset() {
    let (_env, _admin, _user, _token, client) = setup();
    // No pool configured yet → position reads 0, deposit errors.
    assert_eq!(client.blend_position(), 0);
    assert!(client.try_deposit_to_blend(&(100 * USDC)).is_err());
}

#[test]
fn test_blend_deposit_accrues_and_withdraws() {
    let (env, admin, user, token_addr, client) = setup();
    let _pool = setup_pool(&env, &admin, &token_addr, &client);

    // User locks 100 USDC → contract holds it idle.
    let amount = 100 * USDC;
    client.lock(&user, &amount, &12u32);

    // Keeper sweeps idle USDC into the pool.
    client.deposit_to_blend(&amount);
    assert_eq!(client.blend_position(), amount); // 100 USDC, no time elapsed

    // A year passes → 10% yield accrues in the pool.
    let now = env.ledger().timestamp();
    env.ledger().set_timestamp(now + ONE_YEAR);
    assert_eq!(client.blend_position(), 110 * USDC);

    // Keeper pulls 40 USDC back into the contract.
    client.withdraw_from_blend(&(40 * USDC));
    assert_eq!(client.blend_position(), 70 * USDC); // 110 - 40 = 70 USDC left
}
