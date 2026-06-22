import { useState, useCallback, useEffect } from "react";
import { useWallet } from "../../../hooks/useWallet";
import * as LockedIn from "locked_in";
import { rpcUrl } from "../../../contracts/util";
import { buildClient, sendWithAuth } from "../../../contracts/clientHelpers";

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

// Single source of truth: the deployed contract id baked into the binding.
export const LOCKED_VAULT_CONTRACT_ID = LockedIn.networks.testnet.contractId;

type WalletMethods = {
  signTransaction?: ReturnType<typeof useWallet>["signTransaction"];
  signAuthEntry?: ReturnType<typeof useWallet>["signAuthEntry"];
};

function makeClient(address: string, w?: WalletMethods) {
  return buildClient(
    LockedIn.Client,
    { ...LockedIn.networks.testnet, rpcUrl },
    address,
    w?.signTransaction,
    w?.signAuthEntry,
  );
}

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
      const client = makeClient(address);
      const tx = await client.get_apy_tiers();
      setApyTiers(new Map(tx.result));
    } catch (e) {
      // Non-fatal: tiers are display-only; surface in console for debugging.
      console.error("loadApyTiers:", e);
    }
  }, [address]);

  const loadLocks = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const client = makeClient(address);
      const idsTx = await client.get_user_locks({ user: address });
      const ids = idsTx.result;
      const loaded: Lock[] = [];
      for (const id of ids) {
        const lockTx = await client.get_lock({ lock_id: id });
        loaded.push(lockTx.result.unwrap());
      }
      setLocks(loaded);
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (!address) return;
    void loadApyTiers();
    void loadLocks();
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
        const client = makeClient(address, { signTransaction, signAuthEntry });
        const tx = await client.lock({
          user: address,
          amount,
          duration_months: durationMonths,
        });
        const result = await sendWithAuth(tx, address, signAuthEntry);
        const id = result.unwrap();
        await loadLocks();
        return id;
      } catch (e) {
        setLastError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [address, signTransaction, signAuthEntry, loadLocks],
  );

  const unlock = useCallback(
    async (lockId: bigint): Promise<bigint | null> => {
      if (!address || !signTransaction) {
        setLastError("Wallet not connected");
        return null;
      }
      setSubmitting(true);
      setLastError(null);
      try {
        const client = makeClient(address, { signTransaction, signAuthEntry });
        const tx = await client.unlock({ user: address, lock_id: lockId });
        const payout = (
          await sendWithAuth(tx, address, signAuthEntry)
        ).unwrap();
        await loadLocks();
        return payout;
      } catch (e) {
        setLastError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        setSubmitting(false);
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
