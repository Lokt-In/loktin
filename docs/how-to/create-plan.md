# Create Your First Plan

A walkthrough for creating a billing plan and adding bills.

## 1. Open the Plans page

From the dashboard, click **Plans** in the sidebar (or the **Plans** card on the Overview page).

## 2. Click "+ New Plan"

You'll see a form asking for:

- **Duration (months)** : 1 to 12
- **Deposit Amount (USDC)**: total to lock for the plan

A summary appears showing:

- Deposit
- Platform fee (2%)
- Available for bills (deposit minus fee)

## 3. Click "Lock Funds & Create Plan →"

Freighter will pop up. Sign the transaction. The contract:

1. Pulls your USDC into the plan
2. Deducts the 2% fee
3. Creates the plan with a unique ID

## 4. Add bills

The plan card now shows:

- Deposited / Allocated / Remaining / Fee
- A progress bar (cycle progress over time)
- **+ Add Bills** button

Click it and fill in each bill:

- **Name**: e.g. "Rent"
- **Amount**: USDC per occurrence
- **Due Date**: must be day 1–28
- **Category**: pick from the dropdown
- **Recurring monthly**: check if it should auto-rebill

You can add multiple bills in one form before signing. Click "+ Add Another Bill" to stack them.

The form shows running totals. If your total exceeds available balance, the "Submit" button is disabled.

Click "Submit N Bills →" to sign all bills in one transaction.

## 5. Watch them get paid

The Keeper service runs daily at 12:00 UTC. Any bill due today and unpaid gets paid automatically — its status flips from `Pending` to `Paid`. The funds move from the plan's locked balance to the bill's recipient.

You can also manually pay a due bill via the bill detail modal.

## Adjustments (limited)

You can:

- **Skip the next occurrence** of a recurring bill
- **Delete a bill** (and all future occurrences)

…but you only get **one adjustment per plan per month**. After the first adjustment, the contract reverts further changes until next month.

## When a plan ends

Once the plan duration elapses:

- Any unallocated balance is yours to withdraw
- The Keeper periodically cleans up expired plans
- You can also click "End Plan" on the dashboard to claim surplus immediately
