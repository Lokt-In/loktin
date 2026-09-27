use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token::{StellarAssetClient, TokenClient},
    Address, Env, Vec,
};

pub fn create_token_contract<'a>(env: &'a Env, admin: &Address) -> (Address, TokenClient<'a>) {
    let asset = env.register_stellar_asset_contract_v2(admin.clone());
    let address = asset.address();
    (address.clone(), TokenClient::new(env, &address))
}

pub fn create_funded_users(
    env: &Env,
    token: &TokenClient,
    count: u32,
    amount: i128,
) -> Vec<Address> {
    let issuer = StellarAssetClient::new(env, &token.address);
    let mut users = Vec::new(env);
    for _ in 0..count {
        let user = Address::generate(env);
        issuer.mint(&user, &amount);
        users.push_back(user);
    }
    users
}

pub fn mint_tokens(env: &Env, token: &TokenClient, to: &Address, amount: i128) {
    StellarAssetClient::new(env, &token.address).mint(to, &amount);
}

pub fn set_ledger_time(env: &Env, timestamp: u64, sequence: u32) {
    env.ledger().set(LedgerInfo {
        timestamp,
        protocol_version: 23,
        sequence_number: sequence,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3_110_400,
    });
}

pub fn assert_solvable(env: &Env, token_address: &Address, contract: &Address, total_owed: i128) {
    let token = TokenClient::new(env, token_address);
    assert!(
        token.balance(contract) >= total_owed,
        "contract token balance is below the sum of outstanding claims"
    );
}
