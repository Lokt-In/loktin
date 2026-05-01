import { useState, useCallback } from "react";
import { useWallet } from "../../../hooks/useWallet";
import {
  mockDelay,
  getMockTargets,
  createMockTarget,
  depositMockTarget,
  withdrawMockTarget,
} from "../../../lib/mockState";

/* ─── REAL IMPORTS (restore when contract auth is fixed) ─────────────────────
import * as TargetSavings from "target_savings";
import { rpcUrl } from "../../../contracts/util";
import { buildClient, sendWithAuth } from "../../../contracts/clientHelpers";
─── END REAL IMPORTS ──────────────────────────────────────────────────────── */

export type TargetGoal = {
  id: bigint;
  user: string;
  name: string;
  target_amount: bigint;
  period_seconds: bigint;
  period_amount: bigint;
  start_date: bigint;
  end_date: bigint;
  deposited: bigint;
  last_deposit_date: bigint;
  missed_periods: number;
  is_complete: boolean;
};

export const TARGET_SAVINGS_CONTRACT_ID =
  "CAF4L2VNNCUMBGBSHXLHGKLPPKBSF65GGXDQQIBDF4IGJWXPPBOEDBAF";

/* ─── MOCK IMPLEMENTATION ────────────────────────────────────────────────── */

export function useTargets() {
  const { address } = useWallet();
  const [goalIds, setGoalIds] = useState<bigint[]>([]);
  const [goals, setGoals] = useState<TargetGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    await mockDelay(300);
    const raw = getMockTargets(address);
    const parsed: TargetGoal[] = raw.map((t) => ({
      id: BigInt(t.id),
      user: t.user,
      name: t.name,
      target_amount: BigInt(t.target_amount),
      period_seconds: BigInt(t.period_seconds),
      period_amount: BigInt(t.period_amount),
      start_date: BigInt(t.start_date),
      end_date: BigInt(t.end_date),
      deposited: BigInt(t.deposited),
      last_deposit_date: BigInt(t.last_deposit_date),
      missed_periods: t.missed_periods,
      is_complete: t.is_complete,
    }));
    setGoalIds(parsed.map((g) => g.id));
    setGoals(parsed);
    setLoading(false);
  }, [address]);

  const createTarget = useCallback(
    async (
      name: string,
      targetAmount: bigint,
      periodSeconds: bigint,
      periodAmount: bigint,
      endDate: bigint,
    ): Promise<bigint | null> => {
      if (!address) {
        setLastError("Wallet not connected");
        return null;
      }
      setSubmitting(true);
      setLastError(null);
      try {
        await mockDelay(800);
        const t = createMockTarget(
          address,
          name,
          targetAmount,
          periodSeconds,
          periodAmount,
          endDate,
        );
        await loadGoals();
        return BigInt(t.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [address, loadGoals],
  );

  const manualDeposit = useCallback(
    async (targetId: bigint, amount: bigint): Promise<boolean> => {
      if (!address) return false;
      try {
        await mockDelay(700);
        depositMockTarget(address, targetId, amount);
        await loadGoals();
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        return false;
      }
    },
    [address, loadGoals],
  );

  const withdraw = useCallback(
    async (targetId: bigint): Promise<bigint | null> => {
      if (!address) return null;
      try {
        await mockDelay(700);
        const returned = withdrawMockTarget(address, targetId);
        await loadGoals();
        return returned;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        return null;
      }
    },
    [address, loadGoals],
  );

  return {
    goalIds,
    goals,
    loading,
    submitting,
    lastError,
    loadGoals,
    createTarget,
    manualDeposit,
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
    TargetSavings.Client,
    { ...TargetSavings.networks.testnet, rpcUrl },
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

export function useTargets() {
  const { address, signTransaction, signAuthEntry } = useWallet();
  ... (full real implementation)
}
─── END REAL IMPLEMENTATION ─────────────────────────────────────────────── */
