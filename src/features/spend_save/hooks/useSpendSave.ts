import { useState, useCallback, useEffect } from "react";
import { useWallet } from "../../../hooks/useWallet";
import {
  mockDelay,
  getMockSpendSave,
  enrollMockSpendSave,
  mockSpend,
  withdrawMockSpendSave,
} from "../../../lib/mockState";

/* ─── REAL IMPORTS (restore when contract auth is fixed) ─────────────────────
import * as SpendSaveContract from "spend_save";
import { rpcUrl } from "../../../contracts/util";
import { buildClient, sendWithAuth } from "../../../contracts/clientHelpers";
─── END REAL IMPORTS ──────────────────────────────────────────────────────── */

export type SpendSavePosition = {
  user: string;
  save_percentage: number;
  saved_balance: bigint;
  total_spent_lifetime: bigint;
  total_saved_lifetime: bigint;
  created_date: bigint;
};

export const SPEND_SAVE_CONTRACT_ID =
  "CBM3XGPO7LDF56OL7EMRAFFLKLZWHFFZZEBAJGAGMD5KJYXQAALTBQPO";

/* ─── MOCK IMPLEMENTATION ────────────────────────────────────────────────── */

export function useSpendSave() {
  const { address } = useWallet();
  const [position, setPosition] = useState<SpendSavePosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  // Current UTC day (1-31) — mock: just use real day
  const [currentDay, setCurrentDay] = useState<number>(new Date().getUTCDate());

  const loadPosition = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    await mockDelay(200);
    const raw = getMockSpendSave(address);
    if (raw) {
      setPosition({
        user: raw.user,
        save_percentage: raw.save_percentage,
        saved_balance: BigInt(raw.saved_balance),
        total_spent_lifetime: BigInt(raw.total_spent_lifetime),
        total_saved_lifetime: BigInt(raw.total_saved_lifetime),
        created_date: BigInt(raw.created_date),
      });
    } else {
      setPosition(null);
    }
    setCurrentDay(new Date().getUTCDate());
    setLoading(false);
  }, [address]);

  useEffect(() => {
    void loadPosition();
  }, [loadPosition]);

  const enroll = useCallback(
    async (savePercentageBps: number): Promise<boolean> => {
      if (!address) {
        setLastError("Wallet not connected");
        return false;
      }
      setSubmitting(true);
      setLastError(null);
      try {
        await mockDelay(700);
        enrollMockSpendSave(address, savePercentageBps);
        await loadPosition();
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [address, loadPosition],
  );

  const spend = useCallback(
    async (
      _recipient: string,
      totalAmount: bigint,
    ): Promise<{ sent: bigint; saved: bigint } | null> => {
      if (!address) return null;
      setSubmitting(true);
      setLastError(null);
      try {
        await mockDelay(700);
        const result = mockSpend(address, totalAmount);
        await loadPosition();
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [address, loadPosition],
  );

  const withdraw = useCallback(
    async (amount: bigint): Promise<boolean> => {
      if (!address) return false;
      setSubmitting(true);
      setLastError(null);
      try {
        // Mock: allow withdrawal on day 28, or within 3 days of 28 for demo flexibility
        const today = new Date().getUTCDate();
        if (today !== 28) {
          throw new Error(
            `Withdrawals only on the 28th (today is the ${today}th)`,
          );
        }
        await mockDelay(700);
        withdrawMockSpendSave(address, amount);
        await loadPosition();
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [address, loadPosition],
  );

  return {
    position,
    loading,
    submitting,
    lastError,
    currentDay,
    loadPosition,
    enroll,
    spend,
    withdraw,
  };
}

/* ─── REAL IMPLEMENTATION (restore when contract auth is fixed) ───────────────

type WalletMethods = {
  signTransaction?: ReturnType<typeof useWallet>["signTransaction"];
  signAuthEntry?: ReturnType<typeof useWallet>["signAuthEntry"];
};

function makeClient(address: string, w?: WalletMethods) {
  return buildClient(
    SpendSaveContract.Client,
    { ...SpendSaveContract.networks.testnet, rpcUrl },
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
    const v = val as { i128?: string | number; u64?: string | number; u32?: string | number };
    return BigInt(v.i128 ?? v.u64 ?? v.u32 ?? 0);
  }
  return 0n;
}

export function useSpendSave() {
  const { address, signTransaction, signAuthEntry } = useWallet();
  ... (full real implementation)
}
─── END REAL IMPLEMENTATION ─────────────────────────────────────────────── */
