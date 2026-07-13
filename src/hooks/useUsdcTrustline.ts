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

  const refresh = useCallback(async () => {
    if (!address) {
      setHasTrustline(null);
      return;
    }
    setLoading(true);
    try {
      const balances = await fetchBalance(address);
      const found = balances.some(
        (b) =>
          (b.asset_type === "credit_alphanum4" ||
            b.asset_type === "credit_alphanum12") &&
          b.asset_code === USDC_ASSET_CODE &&
          b.asset_issuer === USDC_ISSUER,
      );
      setHasTrustline(found);
    } catch {
      // Account not found / unfunded → no trustline yet.
      setHasTrustline(false);
    } finally {
      setLoading(false);
    }
  }, [address]);

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

      const signed = await signTransaction(tx.toXDR(), { networkPassphrase });
      const signedXdr =
        typeof signed === "string" ? signed : signed.signedTxXdr;
      const finalTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
      await horizon.submitTransaction(finalTx);
      await refresh();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [address, signTransaction, refresh]);

  return { hasTrustline, loading, submitting, error, addTrustline, refresh };
}
