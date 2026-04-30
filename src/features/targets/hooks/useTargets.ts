import { useState, useCallback } from "react";
import * as TargetSavings from "target_savings";
import { rpcUrl } from "../../../contracts/util";
import { buildClient } from "../../../contracts/clientHelpers";
import { useWallet } from "../../../hooks/useWallet";

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
    const v = val as {
      i128?: string | number;
      u64?: string | number;
      u32?: string | number;
    };
    return BigInt(v.i128 ?? v.u64 ?? v.u32 ?? 0);
  }
  return 0n;
}

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
  TargetSavings.networks.testnet.contractId;

export function useTargets() {
  const { address, signTransaction, signAuthEntry } = useWallet();
  const [goalIds, setGoalIds] = useState<bigint[]>([]);
  const [goals, setGoals] = useState<TargetGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const contract = makeClient(address);
      const tx = await contract.get_user_goals({ user: address });
      const sim = await tx.simulate();
      const ids = ((sim.result as { value?: unknown })?.value ??
        sim.result ??
        []) as bigint[];
      setGoalIds(ids);

      const details: TargetGoal[] = [];
      for (const id of ids) {
        try {
          const gtx = await contract.get_target({ target_id: id });
          const gsim = await gtx.simulate();
          const raw = ((gsim.result as { value?: unknown })?.value ??
            gsim.result) as Record<string, unknown> | undefined;
          if (!raw) continue;
          details.push({
            id,
            user: raw.user as string,
            name: raw.name as string,
            target_amount: extractValue(raw.target_amount),
            period_seconds: extractValue(raw.period_seconds),
            period_amount: extractValue(raw.period_amount),
            start_date: extractValue(raw.start_date),
            end_date: extractValue(raw.end_date),
            deposited: extractValue(raw.deposited),
            last_deposit_date: extractValue(raw.last_deposit_date),
            missed_periods: Number(raw.missed_periods ?? 0),
            is_complete: raw.is_complete as boolean,
          });
        } catch (e) {
          console.error("get_target:", id, e);
        }
      }
      setGoals(details);
    } catch (e) {
      console.error("loadGoals:", e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  const createTarget = useCallback(
    async (
      name: string,
      targetAmount: bigint,
      periodSeconds: bigint,
      periodAmount: bigint,
      endDate: bigint,
    ): Promise<bigint | null> => {
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
        const tx = await contract.create_target({
          user: address,
          name,
          target_amount: targetAmount,
          period_seconds: periodSeconds,
          period_amount: periodAmount,
          end_date: endDate,
        });
        const sent = await tx.signAndSend();
        const result = (sent as { result?: unknown }).result;
        const id = typeof result === "bigint" ? result : extractValue(result);
        await loadGoals();
        return id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        console.error("createTarget:", e);
        setLastError(msg);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [address, signTransaction, signAuthEntry, loadGoals],
  );

  const manualDeposit = useCallback(
    async (targetId: bigint, amount: bigint): Promise<boolean> => {
      if (!address || !signTransaction) return false;
      try {
        const contract = makeClient(address, {
          signTransaction,
          signAuthEntry,
        });
        const tx = await contract.manual_deposit({
          user: address,
          target_id: targetId,
          amount,
        });
        await tx.signAndSend();
        await loadGoals();
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        console.error("manualDeposit:", e);
        return false;
      }
    },
    [address, signTransaction, signAuthEntry, loadGoals],
  );

  const withdraw = useCallback(
    async (targetId: bigint): Promise<bigint | null> => {
      if (!address || !signTransaction) return null;
      try {
        const contract = makeClient(address, {
          signTransaction,
          signAuthEntry,
        });
        const tx = await contract.withdraw({
          user: address,
          target_id: targetId,
        });
        const sent = await tx.signAndSend();
        const result = (sent as { result?: unknown }).result;
        const amt = typeof result === "bigint" ? result : extractValue(result);
        await loadGoals();
        return amt;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        console.error("withdraw:", e);
        return null;
      }
    },
    [address, signTransaction, signAuthEntry, loadGoals],
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
