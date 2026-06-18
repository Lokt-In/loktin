# Getting Started

Loktin is a savings platform built on Stellar, that offers various savings options designed to suit each and every user.

## What you need

1. A **Stellar wallet** e.g [Freighter](https://freighter.app).
2. A **funded testnet account**. Freighter has a "Fund with Friendbot" button that does this in one click.
3. **Test USDC**. For now, Loktin uses a custom test USDC contract. Reach out and we'll mint some to your wallet.

## Step 1: Connect a wallet and fund your account

1. Install [Freighter](https://chromewebstore.google.com/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk). After install, click the extension icon and follow the setup. Ensure you're on the testnet network
2. Click the gear icon → **Network** → set to **Test Net**.
3. On your wallet's main view, click **Add XLM** → **Fund with Friendbot**. This funds your account with 10,000 XLM used to pay transaction fees.

## Step 2: Pick your first primitive

Each primitive solves a different problem. Pick whichever matches your goal:

- **Behind on bills?** → [Create your first Plan](/how-to/create-plan)
- **Saving for something specific?** → [Set up Target Savings](/how-to/target-savings)
- **Want to lock idle USDC for yield?** → [Lock In USDC](/how-to/lock-in)
- **Want to save automatically when you spend?** → [Enroll in Spend & Save](/how-to/spend-save)

## A note on tokens & wallet UIs

Most Stellar wallets (Freighter, Albedo, etc.) only display **classic** Stellar assets in their UI. They don't show balances of **Soroban contract tokens** like our USDC test token.

This means: even though you'll have 10,000 USDC after we mint to your wallet, **Freighter will show 0 USDC**. That's expected. The Loktin dashboard reads the balance directly from the Soroban contract and displays it correctly.

This is a wallet-side limitation, not a Loktin issue. It also won't apply once mainnet USDC is wrapped as a Soroban Asset Contract.

## Need help?

- [FAQ](/reference/faq)
- [Open an issue on GitHub](https://github.com/Mackenzie-OO7/loktin/issues)
