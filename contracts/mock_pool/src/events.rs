use soroban_sdk::{contractevent, Address};

// admin / config events
#[contractevent]
pub struct ApySet {
    pub apy_bps: u32,
}

#[contractevent]
pub struct ReserveFunded {
    pub amount: i128,
}

// supplier lifecycle events
#[contractevent]
pub struct Supplied {
    pub supplier: Address,
    pub amount: i128,
}

#[contractevent]
pub struct Withdrawn {
    pub supplier: Address,
    pub amount: i128,
}
