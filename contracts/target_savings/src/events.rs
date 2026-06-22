use soroban_sdk::{contractevent, Address};

// goal lifecycle events
#[contractevent]
pub struct TargetCreated {
    pub target_id: u64,
    pub user: Address,
}

#[contractevent]
pub struct ManualDeposit {
    pub target_id: u64,
    pub user: Address,
    pub amount: i128,
}

#[contractevent]
pub struct Withdrawn {
    pub target_id: u64,
    pub user: Address,
    pub to_user: i128,
    pub forfeit: i128,
}

// keeper-driven period events
//
// NOTE: `Missed` derives its first topic from the struct name in snake_case
// ("missed"). The keeper (keeper/src/jobs/target_periodic.ts) detects skipped
// periods via `topics[0] === "missed"`, so this name must stay in sync.
#[contractevent]
pub struct Missed {
    pub target_id: u64,
    pub user: Address,
}

#[contractevent]
pub struct PeriodDeposit {
    pub target_id: u64,
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
