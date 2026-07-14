import { useCallback, useEffect, useState } from "react";
import {
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { useWallet } from "./useWallet";
import { fetchBalance } from "../util/wallet";
import {
  horizonUrl,
  networkPassphrase,
  stellarNetwork,
} from "../contracts/util";
import { USDC_ASSET_CODE, USDC_ISSUER } from "../lib/usdc";

/**
 * Pull a human-readable reason out of a Horizon submit failure. Horizon returns
 * the useful part in `response.data.extras.result_codes`; the bare Error
 * `message` is just "Request failed with status code 400", which is what made
 * the trustline button look broken with no explanation.
 */
function describeHorizonError(e: unknown): string {
  const resp = (e as { response?: { data?: unknown } }).response;
  const data = resp?.data as
    | {
        extras?: {
          result_codes?: { transaction?: string; operations?: string[] };
        };
        title?: string;
        detail?: string;
      }
    | undefined;
  const codes = data?.extras?.result_codes;
  if (codes) {
    const op = codes.operations?.filter((c) => c && c !== "op_success");
    const parts = [codes.transaction, ...(op ?? [])].filter(Boolean);
    if (parts.length) return `Transaction failed: ${parts.join(", ")}`;
  }
  if (data?.detail) return data.detail;
  if (e instanceof Error) return e.message;
  return String(e);
}

/**
 * Detect whether the connected account holds a trustline to the Circle test
 * USDC, and let the user add it. A trustline is required before the account
 * can receive USDC (from the faucet) or deposit into the savings contracts.
 *
 * `changeTrust` is a classic Stellar operation, so this submits through
 * Horizon (not the Soroban RPC), signed once by the user's wallet.
 */
export function useUsdcTrustline() {
  const { address, signTransaction } = useWallet();
  const [hasTrustline, setHasTrustline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkTrustline = useCallback(async (): Promise<boolean | null> => {
    if (!address) return null;
    try {
      const balances = await fetchBalance(address);
      return balances.some(
        (b) =>
          (b.asset_type === "credit_alphanum4" ||
            b.asset_type === "credit_alphanum12") &&
          b.asset_code === USDC_ASSET_CODE &&
          b.asset_issuer === USDC_ISSUER,
      );
    } catch {
      // Account not found / unfunded → no trustline yet.
      return false;
    }
  }, [address]);

  const refresh = useCallback(async () => {
    if (!address) {
      setHasTrustline(null);
      return;
    }
    setLoading(true);
    try {
      setHasTrustline(await checkTrustline());
    } finally {
      setLoading(false);
    }
  }, [address, checkTrustline]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addTrustline = useCallback(async (): Promise<boolean> => {
    if (!address || !signTransaction) {
      setError("Wallet not connected");
      return false;
    }
    setSubmitting(true);
    setError(null);
    try {
      const horizon = new Horizon.Server(horizonUrl, {
        allowHttp: stellarNetwork === "LOCAL",
      });
      const account = await horizon.loadAccount(address);
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset: new Asset(USDC_ASSET_CODE, USDC_ISSUER),
          }),
        )
        .setTimeout(180)
        .build();

      const signed = await signTransaction(tx.toXDR(), {
        networkPassphrase,
        address,
      });
      const signedXdr =
        typeof signed === "string" ? signed : signed.signedTxXdr;
      const finalTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
      await horizon.submitTransaction(finalTx);

      // Horizon's read replica can lag a beat behind the ledger it just wrote,
      // so a single immediate refresh sometimes still reports no trustline and
      // leaves the prompt up. Poll a few times until it shows.
      for (let i = 0; i < 5; i++) {
        const has = await checkTrustline();
        if (has) {
          setHasTrustline(true);
          return true;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      await refresh();
      return true;
    } catch (e) {
      const msg = describeHorizonError(e);
      console.error("addTrustline:", e);
      setError(msg);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [address, signTransaction, checkTrustline, refresh]);

  return { hasTrustline, loading, submitting, error, addTrustline, refresh };
}
