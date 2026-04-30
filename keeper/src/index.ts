import dotenv from "dotenv";
import { Keypair } from "@stellar/stellar-sdk";
import {
  initializeContract,
  initializeTargetSavings,
} from "./payment/client.js";
import { startScheduler, runAllOnce } from "./core/scheduler.js";

dotenv.config();

// ── Validate env ──────────────────────────────────────────────────
const requiredEnvVars = [
  "ADMIN_SECRET_KEY",
  "CONTRACT_ID",
  "RPC_URL",
  "NETWORK_PASSPHRASE",
] as const;

for (const v of requiredEnvVars) {
  if (!process.env[v]) {
    console.error(`❌ Missing required env: ${v}`);
    console.error("   Create a .env file based on .env.example");
    process.exit(1);
  }
}

// ── Init keypair ──────────────────────────────────────────────────
let adminKeypair: Keypair;
try {
  adminKeypair = Keypair.fromSecret(process.env.ADMIN_SECRET_KEY!);
} catch {
  console.error("❌ Invalid admin secret key");
  process.exit(1);
}

// Plans (existing) contract
const loktinContract = initializeContract(
  process.env.ADMIN_SECRET_KEY!,
  process.env.CONTRACT_ID!,
  process.env.RPC_URL!,
  process.env.NETWORK_PASSPHRASE!,
);

// Target Savings (new). Optional — only register the job if env var is set.
const targetSavingsId = process.env.TARGET_SAVINGS_CONTRACT_ID;
const targetSavingsContract = targetSavingsId
  ? initializeTargetSavings(
      process.env.ADMIN_SECRET_KEY!,
      targetSavingsId,
      process.env.RPC_URL!,
      process.env.NETWORK_PASSPHRASE!,
    )
  : null;

// ── Banner ────────────────────────────────────────────────────────
console.log("┌─────────────────────────────────┐");
console.log("│   LOKTIN — Keeper Service       │");
console.log("└─────────────────────────────────┘");
console.log(`  Admin:           ${adminKeypair.publicKey()}`);
console.log(`  Plans:           ${process.env.CONTRACT_ID}`);
console.log(
  `  Target Savings:  ${targetSavingsId ?? "(not configured — target_periodic disabled)"}`,
);
console.log(`  Network:         ${process.env.STELLAR_NETWORK || "testnet"}\n`);

// ── Schedules (env-overridable) ───────────────────────────────────
const schedules = {
  billPayments: process.env.CRON_BILL_PAYMENTS || "0 12 * * *",
  targetPeriodic: process.env.CRON_TARGET_PERIODIC || "0 0 * * *",
  blendIdleSweep: process.env.CRON_BLEND_SWEEP || "0 */6 * * *",
};

// ── Run ───────────────────────────────────────────────────────────
const cfg = {
  loktinContract,
  // If target savings isn't configured, the scheduler will still run other jobs.
  // For safety, we cast — the target_periodic job will simply error out if called
  // without a configured contract.
  targetSavingsContract: targetSavingsContract!,
  adminKeypair,
  schedules,
};

if (process.argv.includes("--now")) {
  runAllOnce(cfg)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Run failed:", err);
      process.exit(1);
    });
} else {
  startScheduler(cfg);
}
