import { useState, useCallback, useEffect } from "react";
import * as SpendSaveContract from "spend_save";
import { rpcUrl } from "../../../contracts/util";
import { buildClient } from "../../../contracts/clientHelpers";
import { useWallet } from "../../../hooks/useWallet";

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
    const v = val as {
      i128?: string | number;
      u64?: string | number;
      u32?: string | number;
    };
    return BigInt(v.i128 ?? v.u64 ?? v.u32 ?? 0);
  }
  return 0n;
}

export type SpendSavePosition = {
  user: string;
  save_percentage: number; // bps
  saved_balance: bigint;
  total_spent_lifetime: bigint;
  total_saved_lifetime: bigint;
  created_date: bigint;
};

export const SPEND_SAVE_CONTRACT_ID =
  SpendSaveContract.networks.testnet.contractId;

export function useSpendSave() {
  const { address, signTransaction, signAuthEntry } = useWallet();
  const [position, setPosition] = useState<SpendSavePosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState<number>(0);

  const loadPosition = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const contract = makeClient(address);
      try {
        const tx = await contract.get_position({ user: address });
        const sim = await tx.simulate();
        const raw = ((sim.result as { value?: unknown })?.value ??
          sim.result) as Record<string, unknown> | undefined;
        if (raw) {
          setPosition({
            user: raw.user as string,
            save_percentage: Number(raw.save_percentage ?? 0),
            saved_balance: extractValue(raw.saved_balance),
            total_spent_lifetime: extractValue(raw.total_spent_lifetime),
            total_saved_lifetime: extractValue(raw.total_saved_lifetime),
            created_date: extractValue(raw.created_date),
          });
        } else {
          setPosition(null);
        }
      } catch {
        // Not enrolled
        setPosition(null);
      }
      // Fetch current UTC day
      const dtx = await contract.current_day_utc();
      const dsim = await dtx.simulate();
      const day = Number(
        (dsim.result as { value?: unknown })?.value ?? dsim.result ?? 0,
      );
      setCurrentDay(day);
    } catch (e) {
      console.error("loadPosition:", e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void loadPosition();
  }, [loadPosition]);

  const enroll = useCallback(
    async (savePercentageBps: number): Promise<boolean> => {
      if (!address || !signTransaction) {
        setLastError("Wallet not connected");
        return false;
      }
      setSubmitting(true);
      setLastError(null);
      try {
        const contract = makeClient(address, {
          signTransaction,
          signAuthEntry,
        });
        const tx = await contract.enroll({
          user: address,
          save_percentage_bps: savePercentageBps,
        });
        await tx.signAndSend();
        await loadPosition();
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        console.error("enroll:", e);
        setLastError(msg);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [address, signTransaction, signAuthEntry, loadPosition],
  );

  const spend = useCallback(
    async (
      recipient: string,
      totalAmount: bigint,
    ): Promise<{ sent: bigint; saved: bigint } | null> => {
      if (!address || !signTransaction) return null;
      setSubmitting(true);
      setLastError(null);
      try {
        const contract = makeClient(address, {
          signTransaction,
          signAuthEntry,
        });
        const tx = await contract.spend({
          user: address,
          recipient,
          total_amount: totalAmount,
        });
        const sent = await tx.signAndSend();
        const result = (sent as { result?: unknown }).result;
        // result is a tuple [sent, saved]
        const arr = ((result as { value?: unknown })?.value ??
          result) as unknown[];
        const sentAmt = extractValue(arr?.[0]);
        const savedAmt = extractValue(arr?.[1]);
        await loadPosition();
        return { sent: sentAmt, saved: savedAmt };
      } catch (e) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        console.error("spend:", e);
        setLastError(msg);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [address, signTransaction, signAuthEntry, loadPosition],
  );

  const withdraw = useCallback(
    async (amount: bigint): Promise<boolean> => {
      if (!address || !signTransaction) return false;
      setSubmitting(true);
      setLastError(null);
      try {
        const contract = makeClient(address, {
          signTransaction,
          signAuthEntry,
        });
        const tx = await contract.withdraw({ user: address, amount });
        await tx.signAndSend();
        await loadPosition();
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        console.error("withdraw:", e);
        setLastError(msg);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [address, signTransaction, signAuthEntry, loadPosition],
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
