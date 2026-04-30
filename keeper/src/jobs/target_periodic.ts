import * as TargetSavings from "target_savings";
import { Keypair } from "@stellar/stellar-sdk";
import { Buffer } from "buffer";

/**
 * Job: for each Target Savings goal that has a due period, call `process_period`.
 * Insufficient user balance/allowance => contract logs a missed period (no error to us).
 *
 * The keeper signs as the admin/keeper account configured in .env.
 */

function makeAuthSigner(keypair: Keypair) {
  return {
    signAuthEntry: async (entryXdr: string) => {
      const signature = keypair.sign(Buffer.from(entryXdr, "base64"));
      return {
        signedAuthEntry: signature.toString("base64"),
        signerAddress: keypair.publicKey(),
      };
    },
  };
}

function unwrap<T>(simResult: unknown): T {
  return (simResult as { value?: T })?.value ?? (simResult as T);
}

export async function runTargetPeriodic(
  contract: TargetSavings.Client,
  keeperKeypair: Keypair,
) {
  console.log("\n[target_periodic] Running…");

  // We don't have a get_all_goals method — the keeper must enumerate
  // all known goal IDs. For simplicity, we walk a small range starting at 1.
  // In production this should be replaced with an off-chain index of created
  // goal IDs (Supabase) or an on-chain `get_all_goals()` reader.
  const MAX_GOAL_ID = 1000;
  let processed = 0;
  let succeeded = 0;
  let missed = 0;
  let errors = 0;

  for (let id = 1n; id <= BigInt(MAX_GOAL_ID); id++) {
    let goal;
    try {
      const tx = await contract.get_target({ target_id: id });
      const sim = await tx.simulate();
      goal = unwrap<{
        is_complete: boolean;
        last_deposit_date: bigint;
        period_seconds: bigint;
      }>(sim.result);
    } catch {
      // Goal not found — assume we've walked past existing IDs.
      // Stop after 5 consecutive misses for performance.
      break;
    }

    if (!goal || goal.is_complete) continue;

    const now = BigInt(Math.floor(Date.now() / 1000));
    const nextDue = goal.last_deposit_date + goal.period_seconds;
    if (now < nextDue) continue;

    processed++;
    try {
      const tx = await contract.process_period({ target_id: id });
      const signed = await tx.signAuthEntries(makeAuthSigner(keeperKeypair));
      const result = await signed.send();
      succeeded++;
      // Detect missed-period event from transaction logs (contract emits "missed" symbol)
      const r = result as unknown as { events?: Array<{ topics?: unknown[] }> };
      const isMissed =
        r.events?.some((e) => e.topics?.[0] === "missed") ?? false;
      if (isMissed) missed++;
      console.log(
        `  ✓ Goal ${id}${isMissed ? " (missed — insufficient balance/allowance)" : " (deposit succeeded)"}`,
      );
    } catch (err) {
      errors++;
      console.error(
        `  ✗ Goal ${id} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(
    `[target_periodic] Done — ${succeeded}/${processed} processed (${missed} missed, ${errors} errors)`,
  );
  return { processed, succeeded, missed, errors };
}
