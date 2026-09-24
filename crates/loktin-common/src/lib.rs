#![no_std]

use soroban_sdk::{Env, IntoVal, Val};

pub const DAY_IN_LEDGERS: u32 = 17280;
pub const LEDGER_TTL_THRESHOLD: u32 = DAY_IN_LEDGERS * 30;
pub const LEDGER_TTL_EXTEND: u32 = DAY_IN_LEDGERS * 365;

pub fn extend_ttl_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(LEDGER_TTL_THRESHOLD, LEDGER_TTL_EXTEND);
}

pub fn extend_ttl_persistent<K>(env: &Env, key: &K)
where
    K: IntoVal<Env, Val>,
{
    env.storage()
        .persistent()
        .extend_ttl(key, LEDGER_TTL_THRESHOLD, LEDGER_TTL_EXTEND);
}

pub fn next_id<K>(env: &Env, key: &K) -> u64
where
    K: IntoVal<Env, Val>,
{
    let mut id: u64 = env.storage().instance().get(key).unwrap_or(0);
    id += 1;
    env.storage().instance().set(key, &id);
    id
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{symbol_short, Env};

    #[test]
    fn test_next_id() {
        let env = Env::default();
        let key = symbol_short!("ID");

        let id1 = next_id(&env, &key);
        assert_eq!(id1, 1);

        let id2 = next_id(&env, &key);
        assert_eq!(id2, 2);

        let id3 = next_id(&env, &key);
        assert_eq!(id3, 3);
    }
}
