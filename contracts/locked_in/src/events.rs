use soroban_sdk::{contractevent, Address};

// admin / config events
#[contractevent]
pub struct ApyTierSet {
    pub duration_months: u32,
    pub apy_basis_points: u32,
}

// lock lifecycle events
#[contractevent]
pub struct Locked {
    pub lock_id: u64,
    pub user: Address,
    pub amount: i128,
    pub projected_yield: i128,
}

#[contractevent]
pub struct Unlocked {
    pub lock_id: u64,
    pub user: Address,
    pub payout: i128,
}

// blend integration events (stubs for now)
#[contractevent]
pub struct BlendDeposit {
    pub amount: i128,
}

#[contractevent]
pub struct BlendWithdraw {
    pub amount: i128,
}
