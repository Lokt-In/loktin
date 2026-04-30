# Spend & Save

Auto-route a percentage of every USDC spend into a side vault. The vault is locked except on the **28th** of each month, which is withdrawal day.

## Why use Spend & Save

This is "round-up" savings, but enforced on-chain. Every time you send USDC to someone via Loktin, a configured slice is automatically diverted to your vault. You don't think about it. You can't forget to do it. You can't break the streak by skipping a transfer.

The 28th-of-month withdrawal rule means the saved money sits for awhile before it's accessible. Compounded across many spends, this builds up meaningful savings.

## How it works

### 1. Enroll once

Pick your save percentage: anywhere from **1% to 50%**. The default suggestion is 10%.

You can change this percentage at any time. It only affects future spends.

### 2. Spend through Loktin

Instead of sending USDC directly from your wallet, you use Loktin's `spend()` flow:

1. Go to **Dashboard → Spend & Save → Spend with auto-save**
2. Enter the recipient's Stellar address
3. Enter the total amount

You see a breakdown before signing:

- Sent to recipient: `amount × (1 - save_pct)`
- Saved to vault: `amount × save_pct`

When you sign, the contract:

1. Pulls `amount` from your wallet (via `transfer_from`)
2. Forwards `(1 - save_pct) × amount` to the recipient
3. Keeps `save_pct × amount` in the vault

This all happens in **one atomic transaction**. Either the recipient gets paid AND the vault gets credited, or neither.

### 3. Vault accumulates

The dashboard shows:

- **Saved Balance**: total USDC currently in your vault
- **Save Rate**: your active percentage
- **Lifetime Saved**: running total since enrollment
- **Lifetime Spent**: total amount sent through Loktin

### 4. Withdraw on the 28th

The contract reads `env.ledger().timestamp()` (UTC), computes the day-of-month using a standard civil-calendar algorithm, and only allows `withdraw()` if the current day is **28**.

If you call `withdraw()` on the 5th, the transaction reverts with `NotWithdrawalDay`.

The dashboard shows a live countdown to the next 28th, and unlocks the **Withdraw** button only when the day is open.

## Walkthrough

[Step-by-step: Enroll in Spend & Save →](/how-to/spend-save)
