# Target Savings

Saving goals. Set a target, a deadline, and a deposit cadence. Loktin debits your wallet on schedule until you hit the goal. **Funds are locked until the end date; early withdrawal forfeits 1%.**

## Why use Target Savings

Saving for something specific; a trip, a deposit, a new laptop, sometimes fails because the money sits in your spending account and gets eaten by daily life. Target Savings moves saved funds into a contract you can't easily pull from.

The 1% forfeit is small enough to not be punitive, but real enough to make you think twice before breaking the goal.

## How it works

### 1. Create a goal

You set:

- **Name**: e.g. "New Apartment"
- **Target amount**: total USDC you want to reach
- **Deposit frequency**: Weekly / Biweekly / Monthly
- **Amount per deposit**: USDC per period
- **End date**: when the goal closes

Loktin shows a projection: at this cadence, you'll deposit X total by the end date. If X falls short of your target, the UI flags the shortfall.

### 2. One-time approval

Because the Keeper will debit your wallet on a schedule, you authorize the Target Savings contract once to spend up to your target amount via the standard Soroban `approve()` allowance pattern.

This is a single signed transaction. Until you revoke the allowance or it expires, the Keeper can pull `period_amount` per debit cycle.

### 3. Automatic periodic deposits

Every day at midnight UTC, the Keeper:

1. Walks all goals
2. For each goal, checks if the next period is due (`now >= last_deposit_date + period_seconds`)
3. If yes, calls `process_period(goal_id)` on the contract
4. The contract uses `transfer_from` to pull `period_amount` from your wallet

If your wallet doesn't have enough USDC, or your allowance has run out, the contract logs a **missed period** and increments the `missed_periods` counter. The end date does **not** shift — you just have less saved than projected.

### 4. Manual top-ups

You can add extra USDC at any time via **Top Up**. Useful when:

- You got a windfall and want to accelerate the goal
- A period was missed and you want to make it up

### 5. Withdrawal

Two cases:

**At or after the end date**: Withdraw 100% of what's saved.

**Before the end date**: Withdraw allowed, but **1% of the saved balance is forfeited** to the platform fee recipient. You receive 99%.

The forfeit is the commitment device. It's small enough that you can break the lock for a real emergency. It's real enough that you won't break it for an impulse.

## Walkthrough

[Step-by-step: Set up Target Savings →](/how-to/target-savings)
