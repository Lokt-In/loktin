import * as Loktin from "plans";
import { Keypair } from "@stellar/stellar-sdk";

type Bill = {
  id: bigint;
  name: string;
  amount: bigint;
  due_date: bigint;
  is_paid: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────

function unwrap<T>(simResult: unknown): T {
  return (simResult as { value?: T })?.value ?? (simResult as T);
}

export function isBillDueToday(bill: Bill): boolean {
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 86400;
  const currentDayStart = Math.floor(now / dayInSeconds) * dayInSeconds;
  const dueDayStart =
    Math.floor(Number(bill.due_date) / dayInSeconds) * dayInSeconds;
  return currentDayStart === dueDayStart && !bill.is_paid;
}

// ── Public API ────────────────────────────────────────────────────

/**
 * `get_all_cycles` is a read: the binding already simulates it, so the value is
 * on `.result` and no transaction needs to be sent.
 *
 * It does call `admin.require_auth()`, but simulation doesn't verify signatures,
 * and the admin is the tx source anyway, so there are never any non-invoker auth
 * entries to sign. The old code signed auth entries and sent a tx, which threw
 * NoUnsignedNonInvokerAuthEntriesError and then swallowed it and returned `[]`,
 * so every run reported "No cycles found" instead of failing.
 *
 * Errors propagate on purpose: a broken read must not look like an empty ledger.
 */
export async function getAllCycles(contract: Loktin.Client): Promise<bigint[]> {
  const tx = await contract.get_all_cycles();
  return tx.result.unwrap();
}

export async function getCycleBills(
  contract: Loktin.Client,
  cycleId: bigint,
): Promise<Bill[]> {
  try {
    const tx = await contract.get_cycle_bills({ cycle_id: cycleId });
    const sim = await tx.simulate();
    const billIds = unwrap<bigint[]>(sim.result) ?? [];
    if (!billIds.length) return [];

    const bills: Bill[] = [];
    for (const billId of billIds) {
      try {
        const btx = await contract.get_bill({ bill_id: billId });
        const bsim = await btx.simulate();
        const billData = unwrap<Bill>(bsim.result);
        if (billData) bills.push(billData);
      } catch (err) {
        console.error(`Error fetching bill ${billId}:`, err);
      }
    }
    return bills;
  } catch (error) {
    console.error(`Error getting bills for cycle ${cycleId}:`, error);
    return [];
  }
}

export async function payBill(
  contract: Loktin.Client,
  billId: bigint,
): Promise<{ success: boolean; billId: bigint; error?: string }> {
  try {
    console.log(`  → Paying bill ${billId}…`);
    const tx = await contract.admin_pay_bill({ bill_id: billId });
    // Same story as `get_all_cycles`: the admin it requires is also the tx
    // source, so the source-account signature authorizes the call and there are
    // no non-invoker auth entries to sign. `signAndSend` uses the signer the
    // client was constructed with (see payment/client.ts).
    await tx.signAndSend();
    console.log(`  ✓ Bill ${billId} paid`);
    return { success: true, billId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ Bill ${billId} failed:`, msg);
    return { success: false, billId, error: msg };
  }
}

export async function processDueBills(
  contract: Loktin.Client,
  // The client already carries the admin signer, so the keypair isn't needed
  // here. Kept in the signature so callers don't have to change.
  _adminKeypair: Keypair,
): Promise<{ processed: number; paid: number; failed: number }> {
  console.log("\n┌─────────────────────────────────┐");
  console.log("│   Processing Due Bills          │");
  console.log("└─────────────────────────────────┘");
  console.log(`  Time: ${new Date().toISOString()}\n`);

  const cycleIds = await getAllCycles(contract);
  if (!cycleIds.length) {
    console.log("  No cycles found.\n");
    return { processed: 0, paid: 0, failed: 0 };
  }
  console.log(`  Cycles: ${cycleIds.length}\n`);

  let processed = 0,
    paid = 0,
    failed = 0;

  for (const cycleId of cycleIds) {
    const bills = await getCycleBills(contract, cycleId);
    for (const bill of bills) {
      if (isBillDueToday(bill)) {
        processed++;
        console.log(
          `  Due today: ${bill.name} (#${bill.id}) — ${Number(bill.amount) / 10_000_000} USDC`,
        );
        const result = await payBill(contract, bill.id);
        if (result.success) paid++;
        else failed++;
      }
    }
  }

  console.log("\n┌─────────────────────────────────┐");
  console.log(`│ Summary: ${paid}/${processed} paid, ${failed} failed `);
  console.log("└─────────────────────────────────┘\n");

  return { processed, paid, failed };
}
