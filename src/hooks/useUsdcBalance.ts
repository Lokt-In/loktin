import { useState, useEffect, useCallback } from "react";
import {
  Contract,
  rpc as StellarRpc,
  Address,
  scValToNative,
  TransactionBuilder,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { useWallet } from "./useWallet";
import { rpcUrl } from "../contracts/util";

// Circle-issued testnet USDC Stellar Asset Contract (SAC).
// Asset: USDC, issuer GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5.
// This is the same `usdc_token` the Loktin contracts are deployed against.
// Users acquire it via the Circle testnet faucet after adding a USDC trustline.
export const USDC_CONTRACT_ID =
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const USDC_DECIMALS = 7;
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

/**
 * Live USDC balance for the connected wallet, read straight off the SAC via a
 * simulated `balance` call. The Locked In flow sizes its Max/percent shortcuts
 * from this, and the resulting lock is a real transfer — so this must never be
 * a mock, or Max would propose an amount the wallet can't fund.
 */
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
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(op)
        .setTimeout(30)
        .build();
      const sim = await server.simulateTransaction(tx);
      if ("result" in sim && sim.result?.retval) {
        const native = scValToNative(sim.result.retval) as
          | bigint
          | number
          | string
          | null
          | undefined;
        setBalance(typeof native === "bigint" ? native : BigInt(native ?? 0));
      } else {
        setBalance(0n);
      }
    } catch (e) {
      // No trustline / never funded simulates as an error; surface as zero.
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
