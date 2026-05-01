import { useState, useEffect, useCallback } from "react";
import { useWallet } from "./useWallet";
import { getMockBalance } from "../lib/mockState";

// Known USDC test token on testnet (matches Loktin's `usdc_token`)
export const USDC_CONTRACT_ID =
  "CCD6TIYLX2PJPFWW2RBNZHAUJPMJVECIPVCILF2NYZWR5GYYDXRM4WHM";
const USDC_DECIMALS = 7;

/* ─── MOCK IMPLEMENTATION ─────────────────────────────────────────────────────
 * Returns mock USDC balance from localStorage instead of querying the chain.
 * Real implementation is below (commented out). Restore by un-commenting.
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

/* ─── REAL IMPLEMENTATION (restore when contract auth is fixed) ───────────────
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
─── END REAL IMPLEMENTATION ─────────────────────────────────────────────── */
