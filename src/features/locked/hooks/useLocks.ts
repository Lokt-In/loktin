import { useState, useCallback, useEffect } from "react";
import * as LockedVault from "locked_vault";
import { rpcUrl } from "../../../contracts/util";
import { buildClient } from "../../../contracts/clientHelpers";
import { useWallet } from "../../../hooks/useWallet";

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
    const v = val as {
      i128?: string | number;
      u64?: string | number;
      u32?: string | number;
    };
    return BigInt(v.i128 ?? v.u64 ?? v.u32 ?? 0);
  }
  return 0n;
}

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

export const LOCKED_VAULT_CONTRACT_ID = LockedVault.networks.testnet.contractId;

export function useLocks() {
  const { address, signTransaction, signAuthEntry } = useWallet();
  const [locks, setLocks] = useState<Lock[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [apyTiers, setApyTiers] = useState<Map<number, number>>(new Map());

  const loadApyTiers = useCallback(async () => {
    if (!address) return;
    try {
      const contract = makeClient(address);
      const tx = await contract.get_apy_tiers();
      const sim = await tx.simulate();
      const raw = (sim.result as { value?: unknown })?.value ?? sim.result;
      const tiers = new Map<number, number>();
      if (raw && typeof raw === "object") {
        // Soroban Map serializes as an array of [key, value] pairs OR similar
        if (Array.isArray(raw)) {
          for (const [k, v] of raw as [number, number][])
            tiers.set(Number(k), Number(v));
        } else {
          for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
            tiers.set(Number(k), Number(v));
          }
        }
      }
      setApyTiers(tiers);
    } catch (e) {
      console.error("loadApyTiers:", e);
    }
  }, [address]);

  const loadLocks = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const contract = makeClient(address);
      const tx = await contract.get_user_locks({ user: address });
      const sim = await tx.simulate();
      const ids = ((sim.result as { value?: unknown })?.value ??
        sim.result ??
        []) as bigint[];

      const details: Lock[] = [];
      for (const id of ids) {
        try {
          const ltx = await contract.get_lock({ lock_id: id });
          const lsim = await ltx.simulate();
          const raw = ((lsim.result as { value?: unknown })?.value ??
            lsim.result) as Record<string, unknown> | undefined;
          if (!raw) continue;
          details.push({
            id,
            user: raw.user as string,
            amount: extractValue(raw.amount),
            apy_basis_points: Number(raw.apy_basis_points ?? 0),
            duration_seconds: extractValue(raw.duration_seconds),
            start_date: extractValue(raw.start_date),
            end_date: extractValue(raw.end_date),
            projected_yield: extractValue(raw.projected_yield),
            is_unlocked: raw.is_unlocked as boolean,
          });
        } catch (e) {
          console.error("get_lock:", id, e);
        }
      }
      setLocks(details);
    } catch (e) {
      console.error("loadLocks:", e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      void loadApyTiers();
      void loadLocks();
    }
  }, [address, loadApyTiers, loadLocks]);

  const lock = useCallback(
    async (amount: bigint, durationMonths: number): Promise<bigint | null> => {
      if (!address || !signTransaction) {
        setLastError("Wallet not connected");
        return null;
      }
      setSubmitting(true);
      setLastError(null);
      try {
        const contract = makeClient(address, {
          signTransaction,
          signAuthEntry,
        });
        const tx = await contract.lock({
          user: address,
          amount,
          duration_months: durationMonths,
        });
        const sent = await tx.signAndSend();
        const result = (sent as { result?: unknown }).result;
        const id = typeof result === "bigint" ? result : extractValue(result);
        await loadLocks();
        return id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        console.error("lock:", e);
        setLastError(msg);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [address, signTransaction, signAuthEntry, loadLocks],
  );

  const unlock = useCallback(
    async (lockId: bigint): Promise<bigint | null> => {
      if (!address || !signTransaction) return null;
      try {
        const contract = makeClient(address, {
          signTransaction,
          signAuthEntry,
        });
        const tx = await contract.unlock({ user: address, lock_id: lockId });
        const sent = await tx.signAndSend();
        const result = (sent as { result?: unknown }).result;
        const amt = typeof result === "bigint" ? result : extractValue(result);
        await loadLocks();
        return amt;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("unlock:", e);
        setLastError(msg);
        return null;
      }
    },
    [address, signTransaction, signAuthEntry, loadLocks],
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
