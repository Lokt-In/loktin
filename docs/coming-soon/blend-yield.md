# Earn via Blend

::: warning In Development
This feature is not live on testnet yet. The infrastructure is in place and the Keeper has placeholder jobs. Wiring real Blend pool calls is the next milestone.
:::

## What it is

[Blend](https://www.blend.capital) is Stellar's lending protocol. When you supply USDC to a Blend pool, you earn yield from borrowers. APY is variable and pool-dependent (commonly 6–12% for USDC).

When Loktin's Blend integration ships, every USDC you commit to a Loktin primitive will be automatically supplied to a Blend pool while it sits idle. Your bills still pay on time. Your goals still mature. Your lock still locks. The difference is your committed capital is also earning.

## How it will work (technical)

Every savings contract (`target_savings`, `locked_in`, `spend_save`, and `plans` for plans) ships with a `BlendIntegration` interface:

```rust
fn deposit_to_blend(env: Env, amount: i128) -> Result<(), Error>;
fn withdraw_from_blend(env: Env, amount: i128) -> Result<(), Error>;
fn blend_position(env: Env) -> i128;
```

Today these emit a stub event and otherwise do nothing. When integrated, the bodies will call Blend's pool contract to supply/withdraw USDC.

The Keeper service has stub jobs already wired in:

- `blend_idle_sweep` runs every 6 hours; checks each contract's idle USDC balance and supplies anything above a threshold to Blend
- `blend_top_up` triggered on user withdrawal requests; pulls from Blend back to the contract before the user-facing withdraw runs

User-facing flows **do not change** when Blend ships. You'll just start seeing real yield numbers in your dashboard instead of the projection.

## Per-primitive impact

| Primitive          | What changes                                                         |
| ------------------ | -------------------------------------------------------------------- |
| **Plans**          | Surplus + un-allocated balance earns yield until used for payments   |
| **Target Savings** | Deposited balance earns yield until withdrawal                       |
| **Locked In**      | Principal earns yield for the entire lock period; **paid at unlock** |
| **Spend & Save**   | Vault balance earns yield until you withdraw on the 28th             |

For "Locked In" specifically, the projected yield number you see at lock time becomes the actual paid yield at unlock. The projection is computed using the same formula the Blend pool will deliver against (assuming the assumed APY tier holds).

## Why it isn't live yet

Blend's pool contracts are mainnet-deployed; testnet pool addresses for our target USDC token need to be confirmed and wired up. We're also stress-testing the cross-contract auth model so a Keeper can supply/withdraw on behalf of the savings contracts without exposing user funds to incorrect routing.
