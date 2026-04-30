import * as Loktin from "lockedin";
import { Keypair } from "@stellar/stellar-sdk";
import { processDueBills } from "../payment/processor.js";

/**
 * Job: pay all bills due today across every cycle.
 * Default schedule: daily at 12:00 UTC.
 */
export async function runBillPayments(
  contract: Loktin.Client,
  adminKeypair: Keypair,
) {
  console.log("\n[bill_payments] Running…");
  const result = await processDueBills(contract, adminKeypair);
  console.log(
    `[bill_payments] Done — ${result.paid}/${result.processed} paid, ${result.failed} failed`,
  );
  return result;
}
