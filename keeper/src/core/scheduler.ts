import cron from "node-cron";
import { Keypair } from "@stellar/stellar-sdk";
import * as Loktin from "plans";
import * as TargetSavings from "target_savings";
import { runBillPayments } from "../jobs/bill_payments.js";
import { runTargetPeriodic } from "../jobs/target_periodic.js";
import {
  runBlendIdleSweep,
  type BlendSweepConfig,
} from "../jobs/blend_idle_sweep.js";
import {
  runReserveTopUp,
  type ReserveTopUpConfig,
} from "../jobs/reserve_top_up.js";

export type SchedulerConfig = {
  loktinContract: Loktin.Client;
  targetSavingsContract: TargetSavings.Client;
  adminKeypair: Keypair;
  blendSweep?: BlendSweepConfig;
  reserveTopUp?: ReserveTopUpConfig;
  schedules: {
    billPayments: string; // default '0 12 * * *' (daily 12:00 UTC)
    targetPeriodic: string; // default '0 0 * * *'  (daily 00:00 UTC)
    blendIdleSweep: string; // default '0 */6 * * *' (every 6h)
  };
};

type JobFn = () => Promise<unknown>;

/**
 * Run a job without letting it throw: the long-running scheduler must survive a
 * single job blowing up. Returns whether the job succeeded so one-shot runs can
 * tell the difference (the cron path ignores it).
 */
function safeRun(name: string, fn: JobFn): () => Promise<boolean> {
  return async () => {
    try {
      await fn();
      return true;
    } catch (err) {
      console.error(`[${name}] Unhandled error:`, err);
      return false;
    }
  };
}

export function startScheduler(cfg: SchedulerConfig) {
  for (const [job, schedule] of Object.entries(cfg.schedules)) {
    if (!cron.validate(schedule)) {
      throw new Error(`Invalid cron schedule for ${job}: ${schedule}`);
    }
  }

  console.log("⏰ Scheduler started");
  console.log("   Jobs registered:");
  console.log(`     - bill_payments:    ${cfg.schedules.billPayments}`);
  console.log(`     - target_periodic:  ${cfg.schedules.targetPeriodic}`);
  console.log(
    `     - blend_idle_sweep: ${cfg.schedules.blendIdleSweep}${cfg.blendSweep ? "" : " (no targets configured)"}`,
  );
  console.log("   Press Ctrl+C to stop.\n");

  cron.schedule(
    cfg.schedules.billPayments,
    safeRun("bill_payments", () =>
      runBillPayments(cfg.loktinContract, cfg.adminKeypair),
    ),
  );

  cron.schedule(
    cfg.schedules.targetPeriodic,
    safeRun("target_periodic", () =>
      runTargetPeriodic(cfg.targetSavingsContract, cfg.adminKeypair),
    ),
  );

  cron.schedule(
    cfg.schedules.blendIdleSweep,
    safeRun("blend_idle_sweep", () => runBlendIdleSweep(cfg.blendSweep)),
  );

  // Reserve top-up runs on the same cadence as the sweep.
  cron.schedule(
    cfg.schedules.blendIdleSweep,
    safeRun("reserve_top_up", () => runReserveTopUp(cfg.reserveTopUp)),
  );

  process.on("SIGINT", () => {
    console.log("\n👋 Keeper stopped");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    console.log("\n👋 Keeper stopped");
    process.exit(0);
  });
}

/**
 * Run every job once (for `npm start -- --now`).
 *
 * Every job still runs even if an earlier one fails, but if any of them failed
 * this throws at the end. That matters for scheduled one-shot runners such as
 * GitHub Actions: without it the process exits 0 and the run goes green while
 * jobs that move money are quietly broken.
 */
export async function runAllOnce(cfg: SchedulerConfig) {
  console.log("🚀 Manual run — executing all jobs once\n");

  const results: [string, boolean][] = [
    [
      "bill_payments",
      await safeRun("bill_payments", () =>
        runBillPayments(cfg.loktinContract, cfg.adminKeypair),
      )(),
    ],
    [
      "target_periodic",
      await safeRun("target_periodic", () =>
        runTargetPeriodic(cfg.targetSavingsContract, cfg.adminKeypair),
      )(),
    ],
    [
      "blend_idle_sweep",
      await safeRun("blend_idle_sweep", () =>
        runBlendIdleSweep(cfg.blendSweep),
      )(),
    ],
    [
      "reserve_top_up",
      await safeRun("reserve_top_up", () =>
        runReserveTopUp(cfg.reserveTopUp),
      )(),
    ],
  ];

  const failed = results.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) {
    throw new Error(
      `${failed.length} of ${results.length} jobs failed: ${failed.join(", ")}`,
    );
  }

  console.log("\n✓ All jobs complete");
}

/**
 * Legacy runOnce: run only the bill payment job (preserves old --now behaviour for plans).
 */
export async function runOnce(contract: Loktin.Client, adminKeypair: Keypair) {
  console.log("🚀 Manual run (bill_payments only)\n");
  await runBillPayments(contract, adminKeypair);
}
