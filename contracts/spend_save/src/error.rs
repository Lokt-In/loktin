use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    AdminNotSet = 2,
    NotEnrolled = 10,
    InvalidPercentage = 11,
    InvalidAmount = 12,
    NotWithdrawalDay = 13,
    InsufficientSavedBalance = 14,
}
