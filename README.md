# Loktin

A platform for automated bill payment management with time-locked funds.

Built with [Scaffold Stellar](https://github.com/AhaLabs/scaffold-stellar).

## Overview

Loktin helps users maintain financial discipline by locking funds in time-based cycles and automatically paying bills on their due dates. Users deposit USDC into billing cycles, add their recurring or one-time bills, and let the keeper service handle payments automatically preventing missed payments and overdrafts.

### Key Features

- **Time-Locked Billing Cycles** - Lock funds for 1-12 months with automatic surplus returns

- **Automated Bill Payments** - Keeper service pays bills on their due dates

- **Recurring Bills** - Set up monthly recurring payments with recurrence calendars

- **Monthly Adjustment Limits** - Prevents excessive bill modifications

- **Over-Allocation Protection** - Ensures bills don't exceed available funds

- **Batch Operations** - Add or cancel multiple bills in a single transaction

## Architecture

```

┌─────────────────────────────────────────────────────────┐

│                    User Interface                        │

│              (React + TypeScript + Vite)                 │

└────────────────────┬────────────────────────────────────┘

                     │

                     ▼

┌─────────────────────────────────────────────────────────┐

│              TypeScript Contract Bindings                │

│           (Auto-generated from WASM spec)                │

└────────────────────┬────────────────────────────────────┘

                     │

                     ▼

┌─────────────────────────────────────────────────────────┐

│              LockedIn Smart Contract                     │

│                  (Rust/Soroban)                          │

│  • Create billing cycles       • Manage bills            │

│  • Payment processing          • Admin functions         │

└─────────────────────────────────────────────────────────┘

                     │

                     ▼

┌─────────────────────────────────────────────────────────┐

│                   Keeper Service                         │

│          (Node.js cron + TypeScript)                     │

│        Automated bill payment processing                 │

└─────────────────────────────────────────────────────────┘

```

## Quick Start

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/) (v22 or higher)
- [Stellar CLI](https://github.com/stellar/stellar-cli)
- [Scaffold Stellar CLI](https://github.com/AhaLabs/scaffold-stellar)

### Installation

```bash

# Clone the repository

git clone https://github.com/Mackenzie-OO7/lockedin.git

cd lockedin/

# Build the contract

cargo build --target wasm32v1-none --release

# (Testnet) Deploy the contract to the Stellar Testnet

stellar contract deploy --wasm target/wasm32v1-none/release/lockedin.wasm --source testnet-user --network testnet  -- --admin <YOUR_WALLET_ADDRESS> \
--usdc_token <USDC_TOKEN_ADDRESS>

# Update environments.toml with your newly deployed contract address

# Install dependencies

npm install

# Start the development server

npm run dev

```

## Contract Features

### Billing Cycle Management

- **Create Cycle** - Lock funds for 1-12 months with customizable duration

- **End Cycle** - Close cycle and return surplus funds after end date

- **Get Cycle Info** - View cycle details, allocated amounts, and remaining balance

### Bill Management

- **Add Bills** - Single or batch bill creation with validation

- **Cancel Bill Occurrence** - Skip one occurrence of recurring bills

- **Cancel Bill Permanently** - Delete bill and all future occurrences

- **Day 1-28 Restriction** - Ensures recurring bills work in all months (including February)

- **Recurrence Calendar** - Precise control over which months bills recur

### Payment Processing

- **User Payment** - Pay bills that are due (enforces due date)

- **Admin Payment** - Admin can pay any bill anytime (for keeper automation and dispute resolution)

- **Keeper Auto-End** - Permissionless cycle ending for expired cycles

## Keeper Service

The keeper service automates bill payments by running scheduled checks for due bills.

### Setup Keeper

```bash

cd keeper

# Install dependencies

npm install

# Configure environment

cp .env.example .env

# Edit .env with your admin secret key

# ADMIN_SECRET_KEY=YOUR_SECRET_KEY_HERE

# Run in scheduled mode (daily at 12:00 PM UTC)

npm start

# Or test immediately

npm start -- --now

```

See [keeper/README.md](./keeper/README.md) for detailed configuration options.

## Development

### Project Structure

```

lockedin/

├── contracts/lockedin/          # Soroban smart contract (Rust)

│   ├── src/

│   │   ├── lib.rs              # Main contract implementation

│   │   ├── types.rs            # Data structures

│   │   ├── error.rs            # Error types

│   │   ├── events.rs           # Contract events

│   │   └── test.rs             # Contract tests (26 totally)

│   └── Cargo.toml

├── keeper/                      # Automated payment service

│   ├── src/

│   │   ├── index.ts            # Cron scheduler

│   │   └── payment.ts          # Payment logic

│   └── package.json

├── packages/lockedin/           # Auto-generated TypeScript bindings

├── src/                         # React frontend

│   ├── pages/

│   │   └── Dashboard.tsx       # Main UI

│   ├── hooks/

│   │   └── useWallet.ts        # Wallet integration

│   └── contracts/util.ts       # Contract utilities

└── environments.toml            # Network configurations

```

### Testing

```bash

cd contracts/lockedin
cargo test

```
