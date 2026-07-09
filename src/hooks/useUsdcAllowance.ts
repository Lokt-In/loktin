import { useState, useEffect, useCallback } from "react";
import {
  Contract,
  rpc as StellarRpc,
  Address,
  scValToNative,
  xdr,
  TransactionBuilder,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { rpcUrl } from "../contracts/util";
import { useWallet } from "./useWallet";
import { USDC_CONTRACT_ID } from "./useUsdcBalance";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

interface Options {
  spenderContract: string;
  /** Raw stroops the spender must be allowed to move. */
  requiredAmount: bigint;
  /** Goal end (unix seconds); the allowance expires then, capped at the network max. */
  endDate?: bigint;
}

/**
 * Tracks (and can top up) the connected wallet's USDC allowance for a spender
 * contract. Split out of `UsdcAllowance` so callers can render their own
 * approval UI against the same logic.
 */
export function useUsdcAllowance({
  spenderContract,
  requiredAmount,
  endDate,
}: Options) {
  const { address, signTransaction } = useWallet();
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const server = new StellarRpc.Server(rpcUrl, {
        allowHttp: rpcUrl.startsWith("http://"),
      });
      const usdcContract = new Contract(USDC_CONTRACT_ID);
      const op = usdcContract.call(
        "allowance",
        new Address(address).toScVal(),
        new Address(spenderContract).toScVal(),
      );
      const account = await server.getAccount(address);
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(op)
        .setTimeout(30)
        .build();
      const sim = await server.simulateTransaction(tx);
      if ("result" in sim && sim.result?.retval) {
        const v = scValToNative(sim.result.retval) as
          | bigint
          | number
          | string
          | null
          | undefined;
        setAllowance(typeof v === "bigint" ? v : BigInt(v ?? 0));
      } else {
        setAllowance(0n);
      }
    } catch (e) {
      console.error("loadAllowance:", e);
      setAllowance(0n);
    } finally {
      setLoading(false);
    }
  }, [address, spenderContract]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const approve = useCallback(async (): Promise<boolean> => {
    if (!address || !signTransaction) return false;
    setApproving(true);
    setError(null);
    try {
      const server = new StellarRpc.Server(rpcUrl, {
        allowHttp: rpcUrl.startsWith("http://"),
      });
      const usdcContract = new Contract(USDC_CONTRACT_ID);

      const latestLedger = (await server.getLatestLedger()).sequence;
      // Expire the allowance at the goal's end date so one approval covers every
      // periodic debit for the whole goal. Soroban entries can't outlive the
      // network's max entry TTL (~3.11M ledgers ≈ 6 months), so cap there; goals
      // longer than that need a re-approval (no way around the network limit).
      const MAX_TTL_LEDGERS = 3_000_000; // safe margin under the network max
      let ledgersToExpiry = 535_680; // ~30d fallback when no end date is given
      if (endDate != null) {
        const nowSecs = BigInt(Math.floor(Date.now() / 1000));
        const secsUntilEnd = endDate > nowSecs ? Number(endDate - nowSecs) : 0;
        // +1 day buffer so the allowance outlives the final scheduled debit
        ledgersToExpiry = Math.ceil((secsUntilEnd + 86_400) / 5);
      }
      const expirationLedger =
        latestLedger + Math.min(ledgersToExpiry, MAX_TTL_LEDGERS);

      const op = usdcContract.call(
        "approve",
        new Address(address).toScVal(),
        new Address(spenderContract).toScVal(),
        xdr.ScVal.scvI128(
          new xdr.Int128Parts({
            hi: xdr.Int64.fromString((requiredAmount >> 64n).toString()),
            lo: xdr.Uint64.fromString(
              (requiredAmount & 0xffffffffffffffffn).toString(),
            ),
          }),
        ),
        xdr.ScVal.scvU32(expirationLedger),
      );

      const account = await server.getAccount(address);
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(op)
        .setTimeout(30)
        .build();

      const prepared = await server.prepareTransaction(tx);
      const signed = await signTransaction(prepared.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      const signedXdr =
        typeof signed === "string" ? signed : signed.signedTxXdr;
      const finalTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const send = await server.sendTransaction(finalTx);

      // Poll until success
      if (send.status === "PENDING") {
        let status = "NOT_FOUND";
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const res = await server.getTransaction(send.hash);
          status = res.status;
          if (status === "SUCCESS" || status === "FAILED") break;
        }
        if (status !== "SUCCESS") throw new Error(`Approve tx ${status}`);
      }
      await refresh();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("approve failed:", e);
      setError(msg);
      return false;
    } finally {
      setApproving(false);
    }
  }, [
    address,
    signTransaction,
    spenderContract,
    requiredAmount,
    endDate,
    refresh,
  ]);

  const sufficient =
    !loading && requiredAmount > 0n && allowance >= requiredAmount;

  return { allowance, sufficient, loading, approving, error, approve, refresh };
}
