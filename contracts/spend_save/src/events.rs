use soroban_sdk::{contractevent, Address};

#[contractevent]
pub struct Enrolled {
    pub user: Address,
    pub save_percentage_bps: u32,
}

#[contractevent]
pub struct Spent {
    pub user: Address,
    pub recipient: Address,
    pub sent: i128,
    pub saved: i128,
}

#[contractevent]
pub struct Withdrawn {
    pub user: Address,
    pub amount: i128,
}

// blend stubs for now
#[contractevent]
pub struct BlendDeposit {
    pub amount: i128,
}

#[contractevent]
pub struct BlendWithdraw {
    pub amount: i128,
}
