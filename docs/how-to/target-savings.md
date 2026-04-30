# Set Up Target Savings

A walkthrough for creating a goal-based savings vault with automatic periodic deposits.

## 1. Open Target Savings

Dashboard → sidebar → **Target Savings**.

## 2. Click "+ New Goal"

Fill the form:

- **Goal Name** :e.g. "Trip to Stellar Meridian"
- **Target Amount (USDC)**: what you're saving toward
- **End Date** — when the goal closes
- **Deposit Frequency**: Weekly, Biweekly, or Monthly
- **Amount per period**: USDC pulled each cycle

The form shows a live projection: how many periods, total projected deposits, and whether you'll hit the target. If projected total is short, the UI shows the shortfall.

## 3. Click "Create Goal →"

You'll be prompted to **approve** the Target Savings contract first. This is a separate step:

1. The `<UsdcAllowance>` component reads your current allowance
2. If insufficient, shows an "Approve N USDC →" button
3. Click it, sign the approve transaction in Freighter
4. After confirmation, the goal creation transaction fires automatically

The approve grants the contract permission to spend up to your target amount across the goal's lifetime. you only sign this once.

## 4. The Keeper handles the rest

Every day at 00:00 UTC, the Keeper:

1. Checks if your goal's next period is due
2. If yes, calls `process_period(goal_id)` on the contract
3. The contract uses `transfer_from` to pull `period_amount` from your wallet

You don't need to do anything. Just keep your wallet funded.

## 5. Manual top-ups

Click **+ Top Up** on any active goal card. Enter an extra USDC amount, sign — the contract `manual_deposit`s on top of your scheduled deposits.

Useful when:

- A windfall lets you accelerate the goal
- You missed a period and want to make it up
- You want to test the flow without waiting a week

## 6. Withdraw

**At or after the end date:**

1. Click **Withdraw** on the goal card
2. Sign; you get 100% back
3. Goal is marked complete

**Before the end date:**

1. Click **Early Withdraw (-1%)**
2. Confirm the prompt — you understand 1% will be forfeited
3. Sign; you get 99% back, the 1% goes to the platform fee recipient
4. Goal is marked complete

## Missed periods

If your wallet doesn't have enough USDC (or your allowance is exhausted) when the Keeper tries to debit, the contract logs a missed period and increments `missed_periods`. The end date does **not** shift, you just have less saved than projected.

You can recover by manually depositing extra (Top Up) or by topping up your wallet so future automated debits succeed.
