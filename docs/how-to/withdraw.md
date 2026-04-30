# Withdrawing Funds

Each savings primitive has different withdrawal rules. Quick reference:

| Primitive          | Can I withdraw early?         | Penalty?                          |
| ------------------ | ----------------------------- | --------------------------------- |
| **Plans**          | Surplus only at end of plan   | None                              |
| **Target Savings** | Yes, anytime                  | **1% forfeit** if before end date |
| **Locked In**      | **No.** Period.               | N/A — reverts                     |
| **Spend & Save**   | Only on the 28th of the month | None on the 28th                  |

## Plans

When a plan ends:

- Click the plan card on the dashboard
- Look for "End Plan". This is only enabled after the duration has elapsed
- Sign; surplus or un-allocated balanc returns to your wallet

If you don't end the plan manually, the Keeper will eventually clean it up. Either way, your surplus is recoverable.

## Target Savings

1. Open the goal card on the Target Savings dashboard
2. Click **Withdraw** if matured, or **Early Withdraw (-1%)** if not
3. Confirm the prompt
4. Sign; full or 99% of saved balance returns to your wallet

The forfeit (1%) goes to the platform fee recipient.

## Locked In

You wait. There is no early-withdrawal path.

When the lock matures:

1. The **Unlock & Withdraw** button activates on the lock card
2. Click it, sign
3. Principal and accrued yield returns to your wallet

Even if you forget, your principal sits safely in the contract until you call it.

## Spend & Save

1. Wait for the 28th of the month
2. The "Withdraw" button activates
3. Click it, enter an amount up to your saved balance
4. Sign; funds return to your wallet

You can withdraw multiple times on the same day if needed.

## What if Loktin's UI is down?

Your funds are on-chain. You can call any of these withdrawal methods directly:

- **stellar.expert** has a contract method invoker
- **Stellar Lab** at [lab.stellar.org](https://lab.stellar.org/) lets you build raw transactions
- The Stellar SDK has `Contract.call()` for programmatic access

See [Contract IDs](/reference/contract-ids) for the addresses and method signatures.
