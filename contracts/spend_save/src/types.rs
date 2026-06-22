use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SpendSavePosition {
    pub user: Address,
    pub save_percentage: u32, // basis points, 100..5000 (1%..50%)
    pub saved_balance: i128,
    pub total_spent_lifetime: i128,
    pub total_saved_lifetime: i128,
    pub created_date: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    UsdcToken,
    Position(Address),
}
