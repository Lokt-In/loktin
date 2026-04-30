# ZK Privacy Layer

::: warning In Development
A research-and-prototype phase feature. Not shipped yet.
:::

## The motivation

Today, every Loktin position is publicly visible on Stellar. Anyone can look up your wallet address and see exactly how much USDC you have locked, in which primitive, at what cadence. That's a privacy leak we don't want to normalize.

The same is true once Blend integration is live, pooled positions across users would be observable, and large pool participants could be doxxed.

## What ZK adds

Zero-knowledge proofs let users **prove statements about their positions without revealing the underlying data**. Concretely:

- Prove "this user has at least X USDC in target savings" without revealing the actual amount
- Prove "this user has been making consistent deposits for N months" without revealing dates or amounts
- Pool deposits across many users into one shielded position with Blend, where individual user balances are private

## Anchored to Loktin's data model

The savings contracts already expose only the minimum data necessary on-chain:

- `users` (no PII — just wallet address)
- `target_goals` (amount, cadence, status)
- `locks` (amount, term, status)
- `spend_save_position` (rate, balance)

The ZK layer will sit _above_ the savings contracts. Users will be able to opt into a shielded variant that records a commitment hash on-chain and a private witness in a local-stored note.

<!-- ## Status

Pre-RFC. We're sketching the trust model and benchmarking proof systems compatible with Soroban (Halo 2 and Spartan are both candidates).

This is genuinely "later" — months out, not weeks. But the architecture is built so it can plug in without re-deploying the savings contracts. -->
