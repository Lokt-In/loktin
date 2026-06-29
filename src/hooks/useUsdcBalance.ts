import { useState, useEffect, useCallback } from "react";
import { useWallet } from "./useWallet";
import { getMockBalance } from "../lib/mockState";

// Circle-issued testnet USDC Stellar Asset Contract (SAC).
// Asset: USDC, issuer GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5.
// This is the same `usdc_token` the Loktin contracts are deployed against.
// Users acquire it via the Circle testnet faucet after adding a USDC trustline.
export const USDC_CONTRACT_ID =
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const USDC_DECIMALS = 7;

/* ─── MOCK IMPLEMENTATION ─────────────────────────────────────────────────────
 * Returns mock USDC balance from localStorage instead of querying the chain.
 * ─────────────────────────────────────────────────────────────────────────── */

export function useUsdcBalance() {
  const { address } = useWallet();
  const [balance, setBalance] = useState<bigint>(0n);
  const loading = false;

  const refresh = useCallback(() => {
    if (!address) {
      setBalance(0n);
      return;
    }
    setBalance(getMockBalance(address));
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const formatted = (
    Number(balance) / Math.pow(10, USDC_DECIMALS)
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return { balance, formatted, loading, refresh };
}

/* Actual implementation 
import {
  Contract,
  rpc as StellarRpc,
  Address,
  scValToNative,
} from "@stellar/stellar-sdk";
import { rpcUrl } from "../contracts/util";

export function useUsdcBalance(contractId: string = USDC_CONTRACT_ID) {
  const { address } = useWallet();
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) {
      setBalance(0n);
      return;
    }
    setLoading(true);
    try {
      const server = new StellarRpc.Server(rpcUrl, {
        allowHttp: rpcUrl.startsWith("http://"),
      });
      const contract = new Contract(contractId);
      const op = contract.call("balance", new Address(address).toScVal());
      const account = await server.getAccount(address);
      const tx = new (await import("@stellar/stellar-sdk")).TransactionBuilder(
        account,
        {
          fee: "100",
          networkPassphrase: "Test SDF Network ; September 2015",
        },
      )
        .addOperation(op)
        .setTimeout(30)
        .build();
      const sim = await server.simulateTransaction(tx);
      if ("result" in sim && sim.result) {
        const retval = sim.result.retval;
        if (retval) {
          const native = scValToNative(retval) as
            | bigint
            | number
            | string
            | null
            | undefined;
          setBalance(typeof native === "bigint" ? native : BigInt(native ?? 0));
        }
      }
    } catch (e) {
      console.error("useUsdcBalance:", e);
      setBalance(0n);
    } finally {
      setLoading(false);
    }
  }, [address, contractId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const formatted = (
    Number(balance) / Math.pow(10, USDC_DECIMALS)
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return { balance, formatted, loading, refresh };
}
*/
