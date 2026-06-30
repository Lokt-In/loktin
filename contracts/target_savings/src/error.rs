use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    AdminNotSet = 2,
    GoalNotFound = 10,
    GoalAlreadyComplete = 11,
    InvalidAmount = 12,
    InvalidDuration = 13,
    InvalidPeriod = 14,
    PeriodNotDue = 15,
    InsufficientUserBalance = 16,
    InsufficientUserAllowance = 17,
    NotGoalOwner = 18,
    PoolNotSet = 19,
}
