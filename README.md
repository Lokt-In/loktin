# Loktin

Loktin is a savings platform built on Stellar that uses on-chain commitment devices to help you do what you already know you should: pay bills on time, hit savings goals, set aside a fixed reserve, and skim a little off every spend.

Every commitment is enforced by a smart contract. Once funds are committed, they behave only according to the platform's rules. Idle USDC is put to work, generating a return while it waits.

## How it works

- **Plan** — Decide on your commitment: a bill schedule, a savings goal, a fixed lock, or a save-on-spend rule.
- **Lock In** — A smart contract takes custody of your USDC according to the plan's rules: time-locked, rule-locked, or schedule-locked.
- **Earn** — Idle USDC routes through [Blend](https://www.blend.capital) to generate yield while it waits.

## The four primitives

Loktin ships with four distinct savings options. You don't have to use all four; most users start with one and add others as their needs grow.

| Primitive | What it does | Withdrawal rule |
| --- | --- | --- |
| **Plans** | Lock USDC and schedule bill payments. Pays automatically on due dates. | Surplus returns at the end of the plan duration |
| **Target Savings** | Goal-based vault with periodic auto-deposits. | Locked until the end date |
| **Locked In** | Fixed-amount, fixed-term lock with tiered APY. | No early withdrawal, it unlocks at maturity |
| **Spend & Save** | Routes a configured % (1–50%) of every USDC spend into a side vault. | Saved funds withdrawable only on a specific day of the month |

## Features

- **Automated bill payments** — Add recurring or one-time bills with due dates, and Loktin pays them on time, on-chain. No missed payments, no overdrafts.
- **Goal-based saving** — Set a target amount, deadline, and cadence; Loktin auto-debits on schedule until you reach it.
- **Fixed-term locks** — Commit a fixed amount for a fixed term at a tiered APY, with no way to break the lock early.
- **Save-on-spend** — Automatically divert a slice of every transaction into a vault you can only tap once a month.
- **Yield on idle funds** — Committed USDC across every primitive is designed to earn yield through the Blend lending protocol while it sits.
