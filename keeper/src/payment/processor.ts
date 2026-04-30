import * as Loktin from "lockedin";
import { Keypair } from "@stellar/stellar-sdk";
import { Buffer } from "buffer";

type Bill = {
  id: bigint;
  name: string;
  amount: bigint;
  due_date: bigint;
  is_paid: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────

function makeAuthSigner(adminKeypair: Keypair) {
  return {
    signAuthEntry: async (entryXdr: string) => {
      const signature = adminKeypair.sign(Buffer.from(entryXdr, "base64"));
      return {
        signedAuthEntry: signature.toString("base64"),
        signerAddress: adminKeypair.publicKey(),
      };
    },
  };
}

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

export async function getAllCycles(
  contract: Loktin.Client,
  adminKeypair: Keypair,
): Promise<bigint[]> {
  try {
    const tx = await contract.get_all_cycles();
    const signed = await tx.signAuthEntries(makeAuthSigner(adminKeypair));
    const result = await signed.send();
    return unwrap<bigint[]>(result) ?? [];
  } catch (error) {
    console.error("Error getting all cycles:", error);
    return [];
  }
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
  adminKeypair: Keypair,
  billId: bigint,
): Promise<{ success: boolean; billId: bigint; error?: string }> {
  try {
    console.log(`  → Paying bill ${billId}…`);
    const tx = await contract.admin_pay_bill({ bill_id: billId });
    const signed = await tx.signAuthEntries(makeAuthSigner(adminKeypair));
    await signed.send();
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
  adminKeypair: Keypair,
): Promise<{ processed: number; paid: number; failed: number }> {
  console.log("\n┌─────────────────────────────────┐");
  console.log("│   Processing Due Bills          │");
  console.log("└─────────────────────────────────┘");
  console.log(`  Time: ${new Date().toISOString()}\n`);

  const cycleIds = await getAllCycles(contract, adminKeypair);
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
        const result = await payBill(contract, adminKeypair, bill.id);
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
