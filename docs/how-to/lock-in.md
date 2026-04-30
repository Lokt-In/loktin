# Lock In USDC

A walkthrough for creating a fixed-term lock with tiered APY.

## 1. Open Locked In

Dashboard → sidebar → **Locked In**.

## 2. Click "+ New Lock"

Fill in:

- Amount to Lock (USDC)
- Lock Duration: pick a tier from the live-fetched APY table (default: 1mo @ 4%, 3mo @ 6%, 6mo @ 8%, 12mo @ 10%)

A summary appears showing:

- Principal locked
- Duration
- APY (from the selected tier)
- Projected yield
- Total at unlock

## 3. Click "Lock USDC →"

You'll be prompted to approve the Locked Vault contract first (one-time per amount). Sign the approve transaction in your wallet.

After approval confirms, the lock transaction fires automatically. The contract:

1. Pulls your USDC into the vault
2. Computes and stores `projected_yield`
3. Returns a `lock_id`

## 4. Wait

That's it.

The dashboard shows:

- A **countdown** to the unlock date
- A **progress bar** of the lock period
- The **projected yield**

There is no early withdrawal. The contract method `unlock()` reverts unconditionally if `now < end_date`. This isn't a limitation we can override as it is the entire point of this savings option.

## 5. Unlock at maturity

Once `now >= end_date`, the **Unlock & Withdraw** button activates. Click it, sign — your principal is returned.

Accrued yield will be added to the principal at unlock.
