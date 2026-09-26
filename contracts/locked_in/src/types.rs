use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Lock {
    pub id: u64,
    pub user: Address,
    pub amount: i128,
    /// Shares of the pooled vault held by this lock. The maturity payout is
    /// what these shares redeem for — never a pre-computed figure.
    pub shares: i128,
    pub apy_basis_points: u32,
    pub duration_seconds: u64,
    pub start_date: u64,
    pub end_date: u64,
    /// Display-only estimate computed at lock time from the APY tier. It is
    /// **not** a promise: `unlock` pays the shares' real redemption value, so
    /// this field can over- or under-state the payout depending on what the
    /// pool actually earned.
    pub projected_yield: i128,
    pub is_unlocked: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    UsdcToken,
    LockCounter,
    /// Vault-wide shares outstanding across all live locks.
    TotalShares,
    Lock(u64),
    UserLocks(Address),
    ApyTiers,
    Pool, // Address of the (mock) Blend pool, set post-deploy via set_pool
}
