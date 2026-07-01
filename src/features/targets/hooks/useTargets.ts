import { useState, useCallback } from "react";
import { useWallet } from "../../../hooks/useWallet";
import * as TargetSavings from "target_savings";
import { rpcUrl } from "../../../contracts/util";
import { buildClient, sendWithAuth } from "../../../contracts/clientHelpers";

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
  accrued_yield: bigint;
  last_deposit_date: bigint;
  missed_periods: number;
  is_complete: boolean;
};

// Single source of truth: the deployed contract id baked into the binding.
export const TARGET_SAVINGS_CONTRACT_ID =
  TargetSavings.networks.testnet.contractId;

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
      const client = makeClient(address);
      const idsTx = await client.get_user_goals({ user: address });
      const ids = idsTx.result;
      const loaded: TargetGoal[] = [];
      for (const id of ids) {
        const goalTx = await client.get_target({ target_id: id });
        const g = goalTx.result.unwrap();
        loaded.push({
          id: g.id,
          user: g.user,
          name: g.name,
          target_amount: g.target_amount,
          period_seconds: g.period_seconds,
          period_amount: g.period_amount,
          start_date: g.start_date,
          end_date: g.end_date,
          deposited: g.deposited,
          accrued_yield: g.accrued_yield,
          last_deposit_date: g.last_deposit_date,
          missed_periods: g.missed_periods,
          is_complete: g.is_complete,
        });
      }
      setGoalIds(ids);
      setGoals(loaded);
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
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
        const client = makeClient(address, { signTransaction, signAuthEntry });
        const tx = await client.create_target({
          user: address,
          name,
          target_amount: targetAmount,
          period_seconds: periodSeconds,
          period_amount: periodAmount,
          end_date: endDate,
        });
        const result = await sendWithAuth(tx, address, signAuthEntry);
        const id = result.unwrap();
        await loadGoals();
        return id;
      } catch (e) {
        setLastError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [address, signTransaction, signAuthEntry, loadGoals],
  );

  const manualDeposit = useCallback(
    async (targetId: bigint, amount: bigint): Promise<boolean> => {
      if (!address || !signTransaction) {
        setLastError("Wallet not connected");
        return false;
      }
      setSubmitting(true);
      setLastError(null);
      try {
        const client = makeClient(address, { signTransaction, signAuthEntry });
        const tx = await client.manual_deposit({
          user: address,
          target_id: targetId,
          amount,
        });
        (await sendWithAuth(tx, address, signAuthEntry)).unwrap();
        await loadGoals();
        return true;
      } catch (e) {
        setLastError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [address, signTransaction, signAuthEntry, loadGoals],
  );

  const withdraw = useCallback(
    async (targetId: bigint): Promise<bigint | null> => {
      if (!address || !signTransaction) {
        setLastError("Wallet not connected");
        return null;
      }
      setSubmitting(true);
      setLastError(null);
      try {
        const client = makeClient(address, { signTransaction, signAuthEntry });
        const tx = await client.withdraw({
          user: address,
          target_id: targetId,
        });
        const returned = (
          await sendWithAuth(tx, address, signAuthEntry)
        ).unwrap();
        await loadGoals();
        return returned;
      } catch (e) {
        setLastError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        setSubmitting(false);
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
