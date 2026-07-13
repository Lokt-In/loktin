import * as Loktin from "plans";
import * as TargetSavings from "target_savings";
import { Keypair } from "@stellar/stellar-sdk";
import { basicNodeSigner } from "@stellar/stellar-sdk/contract";

// The keeper is both the tx source and the required authorizer (admin/keeper),
// so a transaction signature (source-account auth) covers `require_auth`. We give
// the client a real signer here so state-changing calls can `.signAndSend()`.
export function initializeContract(
  adminSecretKey: string,
  contractId: string,
  rpcUrl: string,
  networkPassphrase: string,
): Loktin.Client {
  const adminKeypair = Keypair.fromSecret(adminSecretKey);
  const signer = basicNodeSigner(adminKeypair, networkPassphrase);
  return new Loktin.Client({
    networkPassphrase,
    contractId,
    rpcUrl,
    publicKey: adminKeypair.publicKey(),
    signTransaction: signer.signTransaction,
    signAuthEntry: signer.signAuthEntry,
  });
}

export function initializeTargetSavings(
  adminSecretKey: string,
  contractId: string,
  rpcUrl: string,
  networkPassphrase: string,
): TargetSavings.Client {
  const adminKeypair = Keypair.fromSecret(adminSecretKey);
  const signer = basicNodeSigner(adminKeypair, networkPassphrase);
  return new TargetSavings.Client({
    networkPassphrase,
    contractId,
    rpcUrl,
    publicKey: adminKeypair.publicKey(),
    signTransaction: signer.signTransaction,
    signAuthEntry: signer.signAuthEntry,
  });
}
