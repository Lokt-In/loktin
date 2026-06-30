import * as TargetSavings from "target_savings";
import { Keypair } from "@stellar/stellar-sdk";
import { withRetry } from "../core/retry.js";
import { getActiveGoalIds } from "../data/goalIndex.js";

/**
 * Job: for each Target Savings goal with a due period, call `process_period`,
 * which pulls `period_amount` from the user's wallet via `transfer_from`.
 * Insufficient balance/allowance => the contract records a missed period (no throw).
 *
 * Goal selection:
 *  - If the off-chain index (Supabase) has active goals, process exactly those.
 *  - Otherwise fall back to walking goal ids 1..N on chain, stopping after a few
 *    consecutive "not found" reads. (Ids are assigned sequentially.)
 * Either way, the on-chain goal is the source of truth for due-ness.
 *
 * Signing: the keeper is the goal's keeper and the tx source, so a single
 * source-account signature authorizes `process_period` (the client is built with
 * a node signer in payment/client.ts, so `.signAndSend()` is enough).
 */

const MAX_GOAL_ID = 1000n;
const MAX_CONSECUTIVE_MISSES = 3;

type Outcome = "processed" | "skipped" | "missing" | "error";

async function tryProcessGoal(
  contract: TargetSavings.Client,
  id: bigint,
): Promise<Outcome> {
  let goal: {
    is_complete: boolean;
    last_deposit_date: bigint;
    period_seconds: bigint;
  };
  try {
    const tx = await withRetry(`get_target(${id})`, () =>
      contract.get_target({ target_id: id }),
    );
    goal = tx.result.unwrap(); // throws if the goal doesn't exist
  } catch {
    return "missing";
  }

  if (goal.is_complete) return "skipped";
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now < goal.last_deposit_date + goal.period_seconds) return "skipped";

  try {
    const tx = await withRetry(`process_period(${id})`, () =>
      contract.process_period({ target_id: id }),
    );
    await tx.signAndSend();
    console.log(`  ✓ Goal ${id} processed`);
    return "processed";
  } catch (err) {
    console.error(
      `  ✗ Goal ${id} failed:`,
      err instanceof Error ? err.message : err,
    );
    return "error";
  }
}

export async function runTargetPeriodic(
  contract: TargetSavings.Client,
  _keeperKeypair: Keypair,
) {
  console.log("\n[target_periodic] Running…");

  let processed = 0;
  let succeeded = 0;
  let errors = 0;

  const indexed = await getActiveGoalIds(contract.options.contractId);

  if (indexed) {
    console.log(`  using goal index (${indexed.length} active)`);
    for (const id of indexed) {
      const outcome = await tryProcessGoal(contract, id);
      if (outcome === "processed") {
        processed++;
        succeeded++;
      } else if (outcome === "error") {
        processed++;
        errors++;
      }
    }
  } else {
    console.log("  no index — walking goal ids on chain");
    let consecutiveMisses = 0;
    for (let id = 1n; id <= MAX_GOAL_ID; id++) {
      const outcome = await tryProcessGoal(contract, id);
      if (outcome === "missing") {
        consecutiveMisses++;
        if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) break;
        continue;
      }
      consecutiveMisses = 0;
      if (outcome === "processed") {
        processed++;
        succeeded++;
      } else if (outcome === "error") {
        processed++;
        errors++;
      }
    }
  }

  console.log(
    `[target_periodic] Done — ${succeeded}/${processed} processed (${errors} errors)`,
  );
  return { processed, succeeded, errors };
}
