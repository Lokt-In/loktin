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
}
