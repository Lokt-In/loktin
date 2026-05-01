import { useState, useCallback } from "react";
import { useWallet } from "../../../hooks/useWallet";
import {
  mockDelay,
  createMockCycle,
  getMockCycles,
  getMockCycleById,
} from "../../../lib/mockState";

/* ─── REAL IMPORTS (restore when contract auth is fixed) ─────────────────────
import * as LockedInContract from "lockedin";
import { rpcUrl } from "../../../contracts/util";
import { buildClient, sendWithAuth } from "../../../contracts/clientHelpers";
─── END REAL IMPORTS ──────────────────────────────────────────────────────── */

export type CycleData = {
  id: bigint;
  user: string;
  start_date: bigint;
  end_date: bigint;
  total_deposited: bigint;
  operating_fee: bigint;
  fee_percentage: bigint;
  is_active: boolean;
};

/* ─── MOCK IMPLEMENTATION ─────────────────────────────────────────────────────
 * All contract calls are replaced with localStorage reads/writes.
 * ─────────────────────────────────────────────────────────────────────────── */

export function useCycles() {
  const { address } = useWallet();
  const [cycleIds, setCycleIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const loadCycles = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    await mockDelay(300);
    const cycles = getMockCycles(address);
    setCycleIds(cycles.map((c) => BigInt(c.id)));
    setLoading(false);
  }, [address]);

  const createCycle = useCallback(
    async (
      durationMonths: number,
      depositUsdc: number,
    ): Promise<bigint | null> => {
      if (!address) {
        setLastError("Wallet not connected");
        return null;
      }
      setCreating(true);
      setLastError(null);
      try {
        await mockDelay(800);
        const amount = BigInt(Math.floor(depositUsdc * 10_000_000));
        const cycle = createMockCycle(address, durationMonths, amount);
        await loadCycles();
        return BigInt(cycle.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        return null;
      } finally {
        setCreating(false);
      }
    },
    [address, loadCycles],
  );

  return { cycleIds, loading, creating, loadCycles, createCycle, lastError };
}

export function useCycleDetails(cycleId: bigint) {
  const { address } = useWallet();
  const [data, setData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!address) return;
    await mockDelay(200);
    const raw = getMockCycleById(cycleId);
    if (raw) {
      setData({
        id: cycleId,
        user: raw.user,
        start_date: BigInt(raw.start_date),
        end_date: BigInt(raw.end_date),
        total_deposited: BigInt(raw.total_deposited),
        operating_fee: BigInt(raw.operating_fee),
        fee_percentage: BigInt(raw.fee_percentage),
        is_active: raw.is_active,
      });
    }
    setLoading(false);
  }, [address, cycleId]);

  return { data, loading, reload: load };
}

/* ─── REAL IMPLEMENTATION (restore when contract auth is fixed) ───────────────

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
    const v = val as { i128?: string | number; u64?: string | number; u32?: string | number };
    const raw = v.i128 ?? v.u64 ?? v.u32 ?? 0;
    return BigInt(raw);
  }
  return 0n;
}

export function useCycles() {
  const { address, signTransaction, signAuthEntry } = useWallet();
  const [cycleIds, setCycleIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const loadCycles = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const contract = makeClient(address);
      const { result } = await contract.get_user_cycles({ user: address });
      setCycleIds(result ?? []);
    } catch (e) {
      console.error("loadCycles:", e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  const createCycle = useCallback(
    async (durationMonths: number, depositUsdc: number): Promise<bigint | null> => {
      if (!address || !signTransaction) {
        setLastError("Wallet not connected");
        return null;
      }
      setCreating(true);
      setLastError(null);
      try {
        const amount = BigInt(Math.floor(depositUsdc * 10_000_000));
        const contract = makeClient(address, { signTransaction, signAuthEntry });
        const tx = await contract.create_cycle({ user: address, duration_months: durationMonths, amount });
        const sent = await sendWithAuth(tx, address, signAuthEntry);
        const result = (sent as { result?: unknown }).result;
        const id = typeof result === "bigint" ? result : extractValue(result);
        await loadCycles();
        return id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        console.error("createCycle full error:", e);
        setLastError(msg);
        return null;
      } finally {
        setCreating(false);
      }
    },
    [address, signTransaction, signAuthEntry, loadCycles],
  );

  return { cycleIds, loading, creating, loadCycles, createCycle, lastError };
}

export function useCycleDetails(cycleId: bigint) {
  const { address } = useWallet();
  const [data, setData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!address) return;
    try {
      const contract = makeClient(address);
      const tx = await contract.get_cycle({ cycle_id: cycleId });
      const sim = await tx.simulate();
      const raw = (sim.result as { value?: unknown })?.value ?? sim.result;
      if (!raw) return;
      const r = raw as Record<string, unknown>;
      setData({
        id: cycleId,
        user: r.user as string,
        start_date: extractValue(r.start_date),
        end_date: extractValue(r.end_date),
        total_deposited: extractValue(r.total_deposited),
        operating_fee: extractValue(r.operating_fee),
        fee_percentage: extractValue(r.fee_percentage),
        is_active: r.is_active as boolean,
      });
    } catch (e) {
      console.error("useCycleDetails:", e);
    } finally {
      setLoading(false);
    }
  }, [address, cycleId]);

  return { data, loading, reload: load };
}
─── END REAL IMPLEMENTATION ─────────────────────────────────────────────── */
