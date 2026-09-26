use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    AdminNotSet = 2,
    LockNotFound = 10,
    LockAlreadyUnlocked = 11,
    LockNotMatured = 12,
    InvalidAmount = 13,
    InvalidDuration = 14,
    NotLockOwner = 15,
    DurationTierMissing = 16,
    PoolNotSet = 17,
    /// The deposit is too small to buy one whole share; minting it would take
    /// the user's money and give them no claim, so the lock is rejected.
    ZeroShares = 18,
    /// The vault cannot cover the shares' redemption value (pool underfunded).
    /// Paying a partial amount would silently short the user.
    InsufficientLiquidity = 19,
}
