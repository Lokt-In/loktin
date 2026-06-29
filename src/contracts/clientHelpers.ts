import {
  Client as ContractClient,
  type AssembledTransaction,
  type ClientOptions,
  type SentTransaction,
} from "@stellar/stellar-sdk/contract";
import { rpcUrl } from "./util";

/**
 * Shared helpers for talking to the generated Soroban contract clients
 * (`packages/{plans,target_savings,locked_in,spend_save}`).
 *
 * Read-only calls are simulated and need no signers. State-changing calls
 * require the connected wallet's `signTransaction`, plus `signAuthEntry` for
 * invocations that the user must authorize (e.g. `create_cycle`, `lock`,
 * `manual_deposit`, `enroll`, `spend`, `withdraw`).
 */

/** Network config shape exposed by a generated client's `networks.<env>`. */
export interface ContractNetwork {
  contractId: string;
  networkPassphrase: string;
  /** Optional RPC override; defaults to the app-configured `rpcUrl`. */
  rpcUrl?: string;
}

type SignTransaction = ClientOptions["signTransaction"];
type SignAuthEntry = ClientOptions["signAuthEntry"];

/** Constructor signature shared by every generated contract `Client`. */
type GeneratedClientCtor<T extends ContractClient> = new (
  options: ClientOptions,
) => T;

/**
 * Build a generated contract client wired to the connected wallet. Pass the
 * generated `Client` class and its `networks.<env>` entry; signers are optional
 * for read-only usage.
 */
export function buildClient<T extends ContractClient>(
  Ctor: GeneratedClientCtor<T>,
  network: ContractNetwork,
  publicKey: string,
  signTransaction?: SignTransaction,
  signAuthEntry?: SignAuthEntry,
): T {
  const url = network.rpcUrl ?? rpcUrl;
  return new Ctor({
    contractId: network.contractId,
    networkPassphrase: network.networkPassphrase,
    rpcUrl: url,
    allowHttp: url.startsWith("http://"),
    publicKey,
    signTransaction,
    signAuthEntry,
  });
}

/**
 * Sign and submit a state-changing `AssembledTransaction`, then poll to
 * completion.
 *
 * In Loktin the connected wallet is both the source account and the authorizing
 * user, so `signAndSend()` signs the invoker auth entries (via the client's
 * `signAuthEntry`) and the envelope (via `signTransaction`). If a *different*
 * account must authorize an entry (non-invoker), those are signed first.
 */
export async function sendWithAuth<T>(
  tx: AssembledTransaction<T>,
  publicKey?: string,
  signAuthEntry?: SignAuthEntry,
): Promise<SentTransaction<T>> {
  const needsNonInvoker = tx.needsNonInvokerSigningBy?.() ?? [];
  if (needsNonInvoker.length > 0 && signAuthEntry && publicKey) {
    await tx.signAuthEntries({ address: publicKey, signAuthEntry });
  }
  return tx.signAndSend();
}

/**
 * Decode common Soroban scalar return shapes — a raw bigint/number/string, or a
 * wrapped `{ i128 | u64 | u32 }` — into a bigint. Returns 0n for anything else.
 */
export function extractValue(val: unknown): bigint {
  if (typeof val === "bigint") return val;
  if (typeof val === "number") return BigInt(Math.trunc(val));
  if (typeof val === "string") return BigInt(val);
  if (val && typeof val === "object") {
    const v = val as {
      i128?: string | number;
      u64?: string | number;
      u32?: string | number;
    };
    const raw = v.i128 ?? v.u64 ?? v.u32;
    if (raw !== undefined) return BigInt(raw);
  }
  return 0n;
}
