use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TargetGoal {
    pub id: u64,
    pub user: Address,
    pub name: String,
    pub target_amount: i128,
    pub period_seconds: u64,
    pub period_amount: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub deposited: i128,
    pub last_deposit_date: u64,
    pub missed_periods: u32,
    pub is_complete: bool,
    // Per-goal yield: interest settled up to `last_yield_update`. Live reads roll
    // it forward to now. Lets each goal show its own exact earned interest.
    pub accrued_yield: i128,
    pub last_yield_update: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Keeper,
    UsdcToken,
    FeeRecipient,
    GoalCounter,
    Goal(u64),
    UserGoals(Address),
    Pool,         // Address of the (mock) Blend pool, set post-deploy via set_pool
    YieldApyBps,  // u32: APY (bps) used to accrue per-goal interest; matches the pool
}
