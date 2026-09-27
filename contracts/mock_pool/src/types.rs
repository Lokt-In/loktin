use soroban_sdk::{contracttype, Address};

/// A supplier's position in the pool. `accrued` is the yield settled up to
/// `last_update`; live reads roll it forward from `last_update` to now.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Position {
    pub principal: i128,
    pub accrued: i128,
    pub last_update: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    // NOTE: the admin address and all roles are owned by OpenZeppelin's
    // AccessControl module (`stellar_access::access_control`), not by this DataKey.
    UsdcToken,
    FeeRecipient, // Option<Address>: receives income; unset (None) by default
    ApyBps,
    Position(Address),
}
