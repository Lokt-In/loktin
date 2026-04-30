# Locked In

A fixed-term USDC lock. Pick an amount, pick a duration, get a tiered APY. No early withdrawal under any circumstance.

This is the strongest commitment Loktin offers.

## Why use Locked In

Sometimes you want to remove the option to spend money entirely. A 6-month lock can't be broken. The contract simply rejects unlock attempts before maturity.

The trade-off for that hardness: you get a higher APY than the more flexible primitives.

## How it works

### 1. Pick a tier

Longer lock = higher rate. The dashboard fetches these tiers live from the contract.

### 2. Lock funds

You provide the amount and duration

The contract:

1. Pulls your USDC into the locked vault
2. Computes `projected_yield = amount × apy × (duration_seconds / year_in_seconds)` and stores it
3. Returns a `lock_id`

The projected yield is **displayed** but not yet credited. It becomes the user's expectation of what they'll receive at the end of the lock period, when Blend integration goes live (see [Earn via Blend](/coming-soon/blend-yield)).

### 3. Wait

That's it. There is no `force_unlock`, no `admin_unlock`, no early-withdrawal-with-penalty. The contract method `unlock()` reverts unconditionally if `now < end_date`.

The dashboard shows a live countdown and a progress bar.

### 4. Unlock at maturity

Once `now >= end_date`, anyone can call `unlock(lock_id)`. The contract:

1. Verifies the lock isn't already unlocked
2. Transfers the principal back to the user
3. Marks the lock as unlocked

In the future, the contract will also pay accrued yield on top of principal.

## What happens to your USDC during the lock

1. Keeper periodically sweeps idle USDC from the contract into a Blend pool, earning supply APY
2. When a user is about to unlock, Keeper pulls the needed amount back from Blend first
3. The user receives principal + accrued Blend yield

<!-- The user-facing methods (`lock`, `unlock`) **do not change** when Blend goes live. The integration sits at the contract-admin layer. -->

## Walkthrough

[Step-by-step: Lock In USDC →](/how-to/lock-in)
