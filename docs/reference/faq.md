# FAQ

## What's the platform fee?

Plans charge a 2% fee at creation, deducted from your initial deposit. The fee is configurable per-deploy and currently goes to the contract admin (the deployer). The other primitives are fee-free.

Target Savings has a 1% **forfeit** on early withdrawal. This is a discipline mechanism, not a recurring fee. You only pay it if you break the lock before the goal's end date.

## Is my money safe?

Loktin is testnet-only today. The USDC is a test token. Even when we move to mainnet:

- **No custody** — you sign every state-changing tx. We never hold your keys.
- **On-chain enforcement** — savings rules are in the contract, not the app. Even if our frontend went down, your funds are recoverable directly from the contracts.

## What happens if Loktin shuts down?

Your funds are still on Stellar. You can:

- Call `withdraw()` / `unlock()` / `end_cycle()` directly via stellar CLI or any Soroban tool
- Use the [contract IDs](/reference/contract-ids) and method signatures published here

The contracts are ownerless from a withdrawal standpoint. Every method that can move user funds is gated by `user.require_auth()`. The admin keypair can do certain ops (pay bills, set APY tiers), but cannot withdraw your money to its own wallet.

## Why is Locked In so strict (no early withdrawal)?

Because the value of a hard commitment is its hardness. If we let you break the lock with a fee, half the users would. By making it impossible, you don't have to fight yourself in a moment of weakness.

If you're not sure you can commit, use Target Savings instead. It has the 1% forfeit option as a softer alternative.

## What's "Blend" and when will yield work?

[Blend](https://www.blend.capital) is Stellar's lending protocol. When integrated, Loktin will route idle USDC across all primitives into Blend pools to earn supply APY while it sits committed.

Status: in development. The contract methods are stubbed in (no-op) and the Keeper has placeholder jobs. See [Earn via Blend](/coming-soon/blend-yield).

## Why the 28th of the month for Spend & Save?

It's the latest day that exists in every month (February has 28). This means the rule works year-round without edge cases. The cooldown also forces real intentionality. You can't withdraw the same day you save.

## Can I use Loktin programmatically (no frontend)?

Yes. All contracts have TypeScript bindings under `packages/` and they're documented at [Contract IDs](/reference/contract-ids). You can build any UI you want, or call them from a script. The frontend at loktin.xyz is just one consumer.

## What chains does Loktin support?

Stellar only, for now. Mainnet support comes after the Blend integration and a third-party audit.

## How do I report a bug or request a feature?

Open an issue on the GitHub repo above. Tag it `bug` or `feature`.
