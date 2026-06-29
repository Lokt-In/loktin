import type {
  Client as ContractClient,
  ClientOptions,
  AssembledTransaction,
} from "@stellar/stellar-sdk/contract";

/**
 * Helpers for talking to the Loktin Soroban contracts from the generated
 * TypeScript bindings (`packages/*`).
 *
 * Auth model (the important bit):
 * Every user-facing contract call (`lock`, `create_target`, `spend`, …) requires
 * `user.require_auth()`, and several of them make a nested `token.transfer`
 * sub-invocation that *also* requires the same user's auth. When the connected
 * wallet is both the transaction source **and** the only required authorizer,
 * a single transaction signature (source-account auth) covers the whole
 * invocation tree — no per-entry signing is needed. We therefore construct the
 * client with `publicKey` set to the connected address so simulation attributes
 * those `require_auth` calls to the invoker, and only fall back to
 * `signAuthEntry` when the contract genuinely needs a *different* signer
 * (cross-contract or contract-account auth).
 */

type SignTransaction = ClientOptions["signTransaction"];
type SignAuthEntry = ClientOptions["signAuthEntry"];

/**
 * Build a typed contract client from a generated binding's `Client` class.
 *
 * @param ClientCtor  The binding's `Client` class (e.g. `LockedIn.Client`).
 * @param network     `{ ...Binding.networks.testnet, rpcUrl }` — carries
 *                    `networkPassphrase`, `contractId`, and `rpcUrl`.
 * @param publicKey   Connected wallet address; becomes the invoker.
 * @param signTransaction / signAuthEntry  Wallet signers (omit for read-only).
 */
export function buildClient<T extends ContractClient>(
  ClientCtor: new (options: ClientOptions) => T,
  network: ClientOptions,
  publicKey: string,
  signTransaction?: SignTransaction,
  signAuthEntry?: SignAuthEntry,
): T {
  return new ClientCtor({
    ...network,
    publicKey,
    signTransaction,
    signAuthEntry,
    allowHttp: network.rpcUrl?.startsWith("http://") ?? false,
  });
}

/**
 * Sign and submit a state-changing call assembled by a binding method.
 *
 * Reads (e.g. `get_user_locks`) don't go through here — call `.simulate()` and
 * read `.result` directly. This is only for writes that must land on-chain.
 *
 * @param tx             The `AssembledTransaction` returned by a binding method.
 * @param address        Connected wallet address (the expected auth-entry signer).
 * @param signAuthEntry  Wallet auth-entry signer; only consulted if the call
 *                       requires signatures from someone other than the invoker.
 * @returns the parsed contract return value.
 */
export async function sendWithAuth<T>(
  tx: AssembledTransaction<T>,
  address: string,
  signAuthEntry?: SignAuthEntry,
): Promise<T> {
  // Addresses (other than the invoker) whose auth entries still need signing.
  const needsSigning = tx.needsNonInvokerSigningBy();
  if (needsSigning.length > 0) {
    if (!signAuthEntry) {
      throw new Error(
        `This action needs an auth signature from: ${needsSigning.join(", ")}`,
      );
    }
    await tx.signAuthEntries({ address, signAuthEntry });
  }

  const sent = await tx.signAndSend();
  return sent.result;
}
