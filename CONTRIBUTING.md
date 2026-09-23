# Contributing

Welcome! and thanks for helping out.

## Before you start

Claim an issue by commenting on it so two people don't build the same thing. Issues carry an area label (`contracts`, `frontend`, `keeper`, `ci`, `infra`) and a points label for rough size.

Some issues say **"Blocked by #N"**. The contracts are being rebuilt in a set order, and starting a blocked issue early means rewriting it. If an issue you want is blocked, say so in a comment and we'll point you at something available.

## Setup

You need **Node 22** (see `.nvmrc`) and **Rust 1.89.0** with the `wasm32v1-none` target (pinned in `rust-toolchain.toml`).

```bash
git clone https://github.com/Lokt-In/loktin.git
cd loktin
cp .env.example .env

npm install
npm run install:contracts   # builds the generated contract clients in packages/
npm run dev
```

`npm run install:contracts` is not optional. Our ESLint rules are type-aware and need the built types from `packages/*/dist`, so `npm run lint` fails without it.

For contract contributions:

```bash
rustup target add wasm32v1-none
cargo test --workspace
```

`.npmrc` sets `legacy-peer-deps=true` for React 19 peer conflicts. Don't remove it.

## Repo layout

```
contracts/        Soroban contracts (Rust). One dir per contract:
                  src/{lib,types,error,events,test}.rs
crates/           Shared Rust crates used by the contracts
packages/         GENERATED TypeScript contract clients — see below
src/features/     Frontend, grouped by domain: components/ hooks/ lib/
src/shared/       Cross-feature UI, layout and helpers
src/pages/        Route components
keeper/           Off-chain service that runs scheduled contract calls
```

New frontend code goes in `src/features/<domain>/`. Look at `src/features/targets/` or `src/features/locked/` for the shape we want — a page composes small components, data access lives in a hook, pure logic in `lib/`.

## Don't edit `packages/`

Those TypeScript clients are generated from *deployed* contracts with `stellar contract bindings ts`, and they carry hardcoded contract IDs. Regenerating requires a deploy, so maintainers do it between phases.

**Contract PRs stop at `cargo test --workspace` passing.** If your change alters a contract's public interface, say so in the PR description and we'll regenerate.

`packages/` is excluded from ESLint and Prettier for the same reason.

## Branches and commits

**All PRs target `staging`.** That's our default branch. Don't open PRs against `main`.

Branch naming follows what's already in the history: `feat/short-description`, `fix/short-description`, `chore/short-description`.

We use Conventional Commits with a lowercase scope and description:

```
feat(spend-save): add percentage selector to enrollment flow
fix(wallet): stop albedo opening a popup every second on connect
chore(ci): run clippy on pull requests
```

Scopes in use: `landing`, `dashboard`, `wallet`, `targets`, `goals`, `onboarding`, `trustline`, `keeper`, `analytics`, `ci`, `npm`.

A pre-commit hook runs `lint-staged`, which applies `eslint --fix` and `prettier --write` to staged files. If it rewrites something, stage the result and commit again.

## Before you open the PR

CI runs exactly this, so run it locally first:

```bash
npm run lint
npx prettier . --check
npm run build
cargo test --workspace --locked      # contract changes only
```

For contract changes also confirm it still compiles to WebAssembly and fits the 128KB network limit:

```bash
cargo build --target wasm32v1-none --release
```

## What we look for in review

- **Every acceptance-criteria box ticked**, or a note saying why not.
- **Tests that would fail without your change.** For contract work involving user funds, that means a test with *more than one user* — most of the bugs we're fixing only appear when two people share a contract.
- **Scope held.** Fix the issue, not the surrounding code. Spotted something else? Open an issue.
- **Follow the neighbouring code.** Match the patterns in the files you're touching rather than introducing a new style.
- **Screenshots** for anything visual, before and after.

## Testing on testnet

Loktin runs on Stellar **testnet** only. To exercise the app you need a wallet with:

1. XLM for fees — any testnet friendbot will fund you
2. A USDC trustline — the app prompts you to add one
3. Testnet USDC — from [Circle's faucet](https://faucet.circle.com/), selecting Stellar

Contracts hold user funds. Treat balance and authorization changes carefully, and prefer failing closed.

We hope you have a great time here!
