import dotenv from "dotenv";
import { Keypair } from "@stellar/stellar-sdk";
import {
  initializeContract,
  initializeTargetSavings,
} from "./payment/client.js";
import { startScheduler, runAllOnce } from "./core/scheduler.js";
import { initGoalIndex } from "./data/goalIndex.js";

dotenv.config();

// Enable the off-chain goal index if Supabase creds are present (else the keeper
// falls back to walking goal ids on chain).
const goalIndexOn = initGoalIndex();

// Never let a single transient network error (e.g. an RPC ECONNRESET in a
// floating promise) take down the keeper. Log and keep going.
process.on("unhandledRejection", (reason) => {
  console.error(
    "⚠ unhandledRejection:",
    reason instanceof Error ? reason.message : reason,
  );
});
process.on("uncaughtException", (err) => {
  console.error(
    "⚠ uncaughtException:",
    err instanceof Error ? err.message : err,
  );
});

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
// Idle-USDC sweep targets: any savings contract whose id is configured.
const sweepTargets = [
  { name: "locked_in", contractId: process.env.LOCKED_IN_CONTRACT_ID },
  {
    name: "target_savings",
    contractId: process.env.TARGET_SAVINGS_CONTRACT_ID,
  },
].filter((t): t is { name: string; contractId: string } =>
  Boolean(t.contractId),
);

const blendSweep =
  process.env.USDC_CONTRACT_ID && sweepTargets.length > 0
    ? {
        targets: sweepTargets,
        usdcSac: process.env.USDC_CONTRACT_ID,
        rpcUrl: process.env.RPC_URL!,
        networkPassphrase: process.env.NETWORK_PASSPHRASE!,
        adminKeypair,
        minSweep: BigInt(process.env.BLEND_SWEEP_MIN ?? "10000000"),
      }
    : undefined;

// Reserve top-up keeps the mock pool able to pay yield (testnet demo safety net).
const reserveTopUp =
  process.env.MOCK_POOL_CONTRACT_ID &&
  process.env.USDC_CONTRACT_ID &&
  sweepTargets.length > 0
    ? {
        poolId: process.env.MOCK_POOL_CONTRACT_ID,
        supplierContractIds: sweepTargets.map((t) => t.contractId),
        usdcSac: process.env.USDC_CONTRACT_ID,
        rpcUrl: process.env.RPC_URL!,
        networkPassphrase: process.env.NETWORK_PASSPHRASE!,
        adminKeypair,
        reserveMin: BigInt(process.env.RESERVE_MIN ?? "10000000"), // 1 USDC
        reserveTarget: BigInt(process.env.RESERVE_TARGET ?? "50000000"), // 5 USDC
        adminKeep: BigInt(process.env.RESERVE_ADMIN_KEEP ?? "20000000"), // keep ≥2 USDC
      }
    : undefined;

console.log(
  `  Goal index:      ${goalIndexOn ? "Supabase" : "off (chain walk)"}`,
);

const cfg = {
  loktinContract,
  // If target savings isn't configured, the scheduler will still run other jobs.
  // For safety, we cast — the target_periodic job will simply error out if called
  // without a configured contract.
  targetSavingsContract: targetSavingsContract!,
  adminKeypair,
  blendSweep,
  reserveTopUp,
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
