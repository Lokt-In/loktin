import { useState, useCallback, useEffect } from "react";
import { useWallet } from "../../../hooks/useWallet";
import {
  mockDelay,
  getMockLocks,
  getMockApyTiers,
  createMockLock,
  unlockMockLock,
} from "../../../lib/mockState";

/* ─── REAL IMPORTS (restore when contract auth is fixed) ─────────────────────
import * as LockedVault from "locked_vault";
import { rpcUrl } from "../../../contracts/util";
import { buildClient, sendWithAuth } from "../../../contracts/clientHelpers";
─── END REAL IMPORTS ──────────────────────────────────────────────────────── */

export type Lock = {
  id: bigint;
  user: string;
  amount: bigint;
  apy_basis_points: number;
  duration_seconds: bigint;
  start_date: bigint;
  end_date: bigint;
  projected_yield: bigint;
  is_unlocked: boolean;
};

export const LOCKED_VAULT_CONTRACT_ID =
  "CCXMCHYO2JGPHYSJQ7ZJWAXR2SZKM2RZECOCI7R234FYS3JCGHSD5WSR";

/* ─── MOCK IMPLEMENTATION ────────────────────────────────────────────────── */

export function useLocks() {
  const { address } = useWallet();
  const [locks, setLocks] = useState<Lock[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [apyTiers, setApyTiers] = useState<Map<number, number>>(new Map());

  const loadApyTiers = useCallback(async () => {
    await mockDelay(100);
    setApyTiers(getMockApyTiers());
  }, []);

  const loadLocks = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    await mockDelay(300);
    const raw = getMockLocks(address);
    setLocks(
      raw.map((l) => ({
        id: BigInt(l.id),
        user: l.user,
        amount: BigInt(l.amount),
        apy_basis_points: l.apy_basis_points,
        duration_seconds: BigInt(l.duration_seconds),
        start_date: BigInt(l.start_date),
        end_date: BigInt(l.end_date),
        projected_yield: BigInt(l.projected_yield),
        is_unlocked: l.is_unlocked,
      })),
    );
    setLoading(false);
  }, [address]);

  useEffect(() => {
    void loadApyTiers();
    if (address) void loadLocks();
  }, [address, loadApyTiers, loadLocks]);

  const lock = useCallback(
    async (amount: bigint, durationMonths: number): Promise<bigint | null> => {
      if (!address) {
        setLastError("Wallet not connected");
        return null;
      }
      setSubmitting(true);
      setLastError(null);
      try {
        await mockDelay(800);
        const l = createMockLock(address, amount, durationMonths);
        await loadLocks();
        return BigInt(l.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [address, loadLocks],
  );

  const unlock = useCallback(
    async (lockId: bigint): Promise<bigint | null> => {
      if (!address) return null;
      try {
        await mockDelay(700);
        const returned = unlockMockLock(lockId);
        await loadLocks();
        return returned;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        return null;
      }
    },
    [address, loadLocks],
  );

  return {
    locks,
    loading,
    submitting,
    lastError,
    apyTiers,
    loadLocks,
    lock,
    unlock,
  };
}

/* ─── REAL IMPLEMENTATION (restore when contract auth is fixed) ───────────────

type WalletMethods = {
  signTransaction?: ReturnType<typeof useWallet>["signTransaction"];
  signAuthEntry?: ReturnType<typeof useWallet>["signAuthEntry"];
};

function makeClient(address: string, w?: WalletMethods) {
  return buildClient(
    LockedVault.Client,
    { ...LockedVault.networks.testnet, rpcUrl },
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

export function useLocks() {
  const { address, signTransaction, signAuthEntry } = useWallet();
  ... (full real implementation)
}
─── END REAL IMPLEMENTATION ─────────────────────────────────────────────── */
