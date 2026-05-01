# Introduction

**Loktin** is a savings platform built on the Stellar network. It uses on-chain commitment devices to help you do what you already know you should: pay bills on time, hit savings goals, set aside a fixed reserve, and skim a little off every spend.

Every option is enforced by a smart contract. Once funds are committed they behave only according to the platform's rules, not even your willpower in a bad moment. We ensure every committed USDC also generates a return.

## The goal: Plan. Lock In. Earn.

- **Plan**: decide on your commitment. A bill schedule, a savings goal, a fixed lock, or a save-on-spend rule.
- **Lock In**: our contract takes custody of the USDC according to the plan's rules. Time-locked, rule-locked, or schedule-locked.
- **Earn**: idle USDC routes through [Blend](https://www.blend.capital) to generate yield while it waits. (Blend integration is in development — see [Earn via Blend](/coming-soon/blend-yield).)

## Four primitives, one platform

Loktin ships with four distinct savings options:

| Primitive          | What it does                                                         | Withdrawal rule                                                           |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Plans**          | Lock USDC + schedule bill payments. Pays automatically on due dates. | Surplus returns at end of plan duration                                   |
| **Target Savings** | Goal-based vault with periodic auto-deposits.                        | Locked until end date; **1% forfeit if early**                            |
| **Locked In**      | Fixed-amount, fixed-term lock with tiered APY.                       | **No early withdrawal.** Unlocks at maturity.                             |
| **Spend & Save**   | Routes a configured % of every USDC spend into a side vault.         | **Withdrawal of saved funds is only available on the 28th of each month** |

You don't have to use all four. Most users start with one and add others as their needs grow.

<!-- ## What makes Loktin different -->

## What's next

- Set up your wallet and connect: [Getting Started →](/getting-started)
- Browse the savings options: [Plans](/primitives/plans), [Target Savings](/primitives/target-savings), [Locked In](/primitives/locked-in), [Spend & Save](/primitives/spend-save)
