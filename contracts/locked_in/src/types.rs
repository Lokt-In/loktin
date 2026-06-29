use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Lock {
    pub id: u64,
    pub user: Address,
    pub amount: i128,
    pub apy_basis_points: u32,
    pub duration_seconds: u64,
    pub start_date: u64,
    pub end_date: u64,
    pub projected_yield: i128,
    pub is_unlocked: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    UsdcToken,
    LockCounter,
    Lock(u64),
    UserLocks(Address),
    ApyTiers,
}
