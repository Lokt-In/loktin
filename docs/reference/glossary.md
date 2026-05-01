# Glossary

Quick definitions for terms that appear throughout this docs.

## Allowance

The ERC-20-style permission a user grants a contract to spend tokens on their behalf. In Loktin, you `approve()` the Target Savings or Spend & Save contract once, and they can `transfer_from` your wallet up to the approved amount until expiration. Required for the periodic-debit and atomic-spend flows.

## Basis points (bps)

1/100th of a percent. APY of 6% = 600 bps. Stored on-chain as integers to avoid floating-point math.

## Bill

A scheduled USDC payment inside a Plan. Has an amount, a due date, a recipient, and (if recurring) a recurrence calendar.

## Blend

[Stellar's lending protocol](https://www.blend.capital). Loktin will route idle USDC into Blend pools to earn yield. See [Earn via Blend](/coming-soon/blend-yield).

## Forfeit

Penalty paid for breaking a savings commitment early. Currently only Target Savings has one (1% on early withdrawal). The forfeit goes to the platform fee recipient.

## Goal

A Target Savings position. Has a name, target amount, end date, deposit cadence, and running balance.

## Keeper

A cron service that runs admin jobs, from paying bills to processing periodic deposits.

## Lock

A Locked In position. Fixed amount, fixed term, no early withdrawal.

## Period

A unit of time between auto-deposits in Target Savings. Weekly, biweekly, or monthly.

## Plan

A billing schedule. Locks USDC for a fixed duration; you attach bills with due dates; the Keeper auto-pays them.

## Position

The on-chain representation of a user's slot in a primitive, a goal, a lock, a SpendSavePosition, etc.

## Primitive

One of Loktin's four savings products (Plans, Target Savings, Locked In, Spend & Save). Each lives in its own Soroban contract.

## Projected yield

The expected interest a Locked In position will earn, computed at lock time and stored on-chain. Display-only today; will be paid from accrued Blend yield once Blend is integrated.

## Recurrence calendar

For recurring bills, an explicit `Vec<u32>` of months (1–12) the bill should fire in. Auto-computed from start date, end date, and day-of-month at bill creation.

## Save percentage

The user-configured rate (1%–50%) of every spend that gets routed to the Spend & Save vault. Stored as basis points on-chain (100..5000).
