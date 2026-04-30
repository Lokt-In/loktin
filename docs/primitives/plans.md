# Plans

Time-locked billing schedules. Lock USDC into a plan, attach bills with due dates, and the Loktin Keeper service auto-pays each bill on the day it's due.

## Why use Plans

You know you'll need $200 for groceries, $50 for internet, and $10 for electricity every month for the next 3 months. Instead of leaving that money in your spending wallet (where it'll get drained), you commit it to a Plan. The contract holds it. The Keeper pays / releases it when it is due.

## How it works

### 1. Create a plan

You choose:

- **Duration** — 1 to 12 months
- **Deposit amount** — total USDC to lock (a 2% platform fee is deducted upfront)

The contract pulls your USDC, locks it for the duration, and gives you a `plan_id`. The remaining 98% becomes your "available for bills" balance.

### 2. Add bills to the plan

Each bill has:

- **Name** : e.g. "Rent"
- **Amount**: USDC per occurrence
- **Due date**: must be day 1–28 of a month (so recurring bills work in February)
- **Recurring?**: if yes, the bill auto-rebills each month within the plan's window
- **Category**: Housing, Utilities, Transportation, Food, Healthcare, Insurance, Entertainment, Education, Debt, Other
- **Recurrence calendar**: for recurring bills, an explicit list of months it should fire (auto-computed from start/end and day-of-month)

Bills can be added in batches. Add 5 bills in one transaction. The contract validates that the sum of all bill amounts (across the plan window) doesn't exceed your available balance.

### 3. Keeper auto-pays

Every day at noon UTC it:

1. Lists all plans
2. For each plan, lists all bills
3. For each bill, checks if it's due today and unpaid
4. If yes, calls `admin_pay_bill(bill_id)` on the contract, which transfers the bill amount from the plan's locked balance to the bill's recipient

You don't need to be online. You don't need to sign anything per-payment. The Keeper has admin rights on the contract for exactly this purpose.

### 4. Manage your bills

Inside the dashboard for each plan, you can:

- Skip the next occurrence of a recurring bill (e.g. "Don't pay Netflix this month")
- Delete a bill permanently. This removes all future occurrences and frees up the allocation
- Manually pay a bill that's currently due (if you want to pay early or avoid waiting on the Keeper)

There's a monthly adjustment limit: you can only add or cancel bills once per plan per month. This stops you from yanking bills out the moment you change your mind.

## End-of-plan behavior

When the plan duration elapses:

- Any remaining balance (un-allocated, or surplus from skipped/cancelled bills) becomes withdrawable.
- The Keeper periodically calls `keeper_end_cycle()` to close expired plans.
- You can also end a plan yourself from the dashboard, but only after the duration has elapsed.

## Security guarantees

- Double-payment prevention: bills track their last paid date; can't be paid twice in a window
- Over-allocation guard: adding bills that would exceed the plan's available balance reverts
- Admin transfer is two-step: initiate + accept, with ledger-bounded expiration

## Walkthrough

[Step-by-step: Create your first plan →](/how-to/create-plan)
