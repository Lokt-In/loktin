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
import { rpcUrl } from "../../contracts/util";
import { useWallet } from "../../hooks/useWallet";
import { USDC_CONTRACT_ID } from "../../hooks/useUsdcBalance";
import Button from "./Button";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

/**
 * Reusable allowance prompt: ensures the connected wallet has approved
 * `spenderContract` to transfer at least `requiredAmount` of USDC.
 *
 * If allowance is insufficient, shows an "Approve" button that signs
 * an `approve` call on the USDC token contract.
 */
interface Props {
  spenderContract: string;
  requiredAmount: bigint; // raw stroops
  endDate?: bigint; // goal end (unix seconds); allowance expires then, capped at the network max
  onReady: () => void; // called when allowance is sufficient
  label?: string; // override prompt label
}

export default function UsdcAllowance({
  spenderContract,
  requiredAmount,
  endDate,
  onReady,
  label,
}: Props) {
  const { address, signTransaction } = useWallet();
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllowance = useCallback(async () => {
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
    void loadAllowance();
  }, [loadAllowance]);

  // If sufficient, immediately call onReady
  useEffect(() => {
    if (!loading && allowance >= requiredAmount && requiredAmount > 0n) {
      onReady();
    }
  }, [loading, allowance, requiredAmount, onReady]);

  const handleApprove = async () => {
    if (!address || !signTransaction) return;
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
      await loadAllowance();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("approve failed:", e);
      setError(msg);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--fg-muted)" }}>
        Checking allowance…
      </p>
    );
  }
  if (allowance >= requiredAmount && requiredAmount > 0n) {
    return null; // sufficient, no UI needed
  }
  return (
    <div
      style={{
        border: "1px solid var(--border-accent)",
        padding: "var(--sp-4)",
        marginBottom: "var(--sp-4)",
      }}
    >
      <p
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "var(--sp-2)",
        }}
      >
        One-time approval needed
      </p>
      <p
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--fg-secondary)",
          marginBottom: "var(--sp-3)",
        }}
      >
        {label ??
          `Authorize this contract to debit USDC from your wallet for periodic deposits.`}
      </p>
      {error && (
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--status-error)",
            marginBottom: "var(--sp-2)",
          }}
        >
          {error}
        </p>
      )}
      <Button
        variant="primary"
        size="sm"
        onClick={() => void handleApprove()}
        isLoading={approving}
      >
        Approve {(Number(requiredAmount) / 10_000_000).toFixed(2)} USDC →
      </Button>
    </div>
  );
}
