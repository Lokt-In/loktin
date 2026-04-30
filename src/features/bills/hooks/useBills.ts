import { useState, useCallback } from "react";
import * as LockedInContract from "lockedin";
import { rpcUrl } from "../../../contracts/util";
import { buildClient } from "../../../contracts/clientHelpers";
import { useWallet } from "../../../hooks/useWallet";

type WalletMethods = {
  signTransaction?: ReturnType<typeof useWallet>["signTransaction"];
  signAuthEntry?: ReturnType<typeof useWallet>["signAuthEntry"];
};

function makeClient(address: string, w?: WalletMethods) {
  return buildClient(
    LockedInContract.Client,
    { ...LockedInContract.networks.testnet, rpcUrl },
    address,
    w?.signTransaction,
    w?.signAuthEntry,
  );
}

function extractValue(val: unknown): bigint {
  if (typeof val === "bigint") return val;
  if (typeof val === "number") return BigInt(val);
  if (typeof val === "string") return BigInt(val);
  if (val && typeof val === "object") {
    const v = val as {
      i128?: string | number;
      u64?: string | number;
      u32?: string | number;
    };
    const raw = v.i128 ?? v.u64 ?? v.u32 ?? 0;
    return BigInt(raw);
  }
  return 0n;
}

export type BillData = {
  id: bigint;
  cycle_id: bigint;
  name: string;
  amount: bigint;
  due_date: bigint;
  is_recurring: boolean;
  is_paid: boolean;
  recurrence_calendar: number[];
  category: BillCategory;
};

export type BillCategory =
  | "Housing"
  | "Utilities"
  | "Transportation"
  | "Food"
  | "Healthcare"
  | "Insurance"
  | "Entertainment"
  | "Education"
  | "Debt"
  | "Other";

export const BILL_CATEGORIES: BillCategory[] = [
  "Housing",
  "Utilities",
  "Transportation",
  "Food",
  "Healthcare",
  "Insurance",
  "Entertainment",
  "Education",
  "Debt",
  "Other",
];

export type NewBill = {
  name: string;
  amount: string;
  dueDate: string;
  isRecurring: boolean;
  category: BillCategory;
};

export function useBills(
  cycleId: bigint,
  startDateTs: bigint,
  endDateTs: bigint,
) {
  const { address, signTransaction, signAuthEntry } = useWallet();
  const [bills, setBills] = useState<BillData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadBills = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const contract = makeClient(address);
      const tx = await contract.get_cycle_bills({ cycle_id: cycleId });
      const sim = await tx.simulate();
      const ids: bigint[] = ((sim.result as { value?: unknown })?.value ??
        sim.result ??
        []) as bigint[];
      if (!ids.length) {
        setBills([]);
        return;
      }

      const details = await Promise.all(
        ids.map(async (billId) => {
          const btx = await contract.get_bill({ bill_id: billId });
          const bsim = await btx.simulate();
          const raw =
            (bsim.result as { value?: unknown })?.value ?? bsim.result;
          const r = raw as Record<string, unknown>;
          const cat = r.category as { tag: BillCategory } | undefined;
          return {
            id: billId,
            cycle_id: cycleId,
            name: r.name as string,
            amount: extractValue(r.amount),
            due_date: extractValue(r.due_date),
            is_recurring: r.is_recurring as boolean,
            is_paid: r.is_paid as boolean,
            recurrence_calendar: (r.recurrence_calendar ?? []) as number[],
            category: cat?.tag ?? "Other",
          } satisfies BillData;
        }),
      );
      setBills(details);
    } catch (e) {
      console.error("loadBills:", e);
    } finally {
      setLoading(false);
    }
  }, [address, cycleId]);

  const addBills = useCallback(
    async (newBills: NewBill[]): Promise<boolean> => {
      if (!address || !signTransaction) return false;
      setSubmitting(true);
      try {
        const cycleStart = new Date(Number(startDateTs) * 1000);
        const cycleEnd = new Date(Number(endDateTs) * 1000);

        const billsToAdd = newBills.map((bill) => {
          const amount = BigInt(
            Math.floor(parseFloat(bill.amount) * 10_000_000),
          );
          const dueDate = BigInt(
            Math.floor(new Date(bill.dueDate).getTime() / 1000),
          );

          let recurrenceCalendar: number[] = [];
          if (bill.isRecurring) {
            const dayOfMonth = new Date(bill.dueDate).getDate();
            const monthsSet = new Set<number>();
            const cur = new Date(cycleStart);
            while (cur <= cycleEnd) {
              const m = cur.getMonth() + 1;
              const yr = cur.getFullYear();
              const potential = new Date(yr, m - 1, dayOfMonth);
              if (potential >= cycleStart && potential <= cycleEnd)
                monthsSet.add(m);
              cur.setMonth(cur.getMonth() + 1);
            }
            recurrenceCalendar = Array.from(monthsSet).sort((a, b) => a - b);
          }
          const category = {
            tag: bill.category,
            values: undefined,
          } as LockedInContract.BillCategory;
          return [
            bill.name,
            amount,
            dueDate,
            bill.isRecurring,
            recurrenceCalendar,
            category,
          ] as const;
        });

        const contract = makeClient(address, {
          signTransaction,
          signAuthEntry,
        });
        const tx = await contract.add_bills({
          cycle_id: cycleId,
          bills: billsToAdd,
        });
        await tx.signAndSend();
        await loadBills();
        return true;
      } catch (e) {
        console.error("addBills:", e);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [
      address,
      signTransaction,
      signAuthEntry,
      cycleId,
      startDateTs,
      endDateTs,
      loadBills,
    ],
  );

  const skipNextOccurrence = useCallback(
    async (billId: bigint): Promise<boolean> => {
      if (!address || !signTransaction) return false;
      try {
        const contract = makeClient(address, {
          signTransaction,
          signAuthEntry,
        });
        const tx = await contract.skip_bill({ bill_id: billId });
        await tx.signAndSend();
        await loadBills();
        return true;
      } catch (e) {
        console.error("skipNextOccurrence:", e);
        return false;
      }
    },
    [address, signTransaction, signAuthEntry, loadBills],
  );

  const deleteBillPermanently = useCallback(
    async (billId: bigint): Promise<boolean> => {
      if (!address || !signTransaction) return false;
      try {
        const contract = makeClient(address, {
          signTransaction,
          signAuthEntry,
        });
        const tx = await contract.delete_bill({ bill_id: billId });
        await tx.signAndSend();
        await loadBills();
        return true;
      } catch (e) {
        console.error("deleteBillPermanently:", e);
        return false;
      }
    },
    [address, signTransaction, signAuthEntry, loadBills],
  );

  return {
    bills,
    loading,
    submitting,
    loadBills,
    addBills,
    skipNextOccurrence,
    deleteBillPermanently,
  };
}
