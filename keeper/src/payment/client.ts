import * as Loktin from "lockedin";
import * as TargetSavings from "target_savings";
import { Keypair } from "@stellar/stellar-sdk";

export function initializeContract(
  adminSecretKey: string,
  contractId: string,
  rpcUrl: string,
  networkPassphrase: string,
): Loktin.Client {
  const adminKeypair = Keypair.fromSecret(adminSecretKey);
  return new Loktin.Client({
    networkPassphrase,
    contractId,
    rpcUrl,
    publicKey: adminKeypair.publicKey(),
  });
}

export function initializeTargetSavings(
  adminSecretKey: string,
  contractId: string,
  rpcUrl: string,
  networkPassphrase: string,
): TargetSavings.Client {
  const adminKeypair = Keypair.fromSecret(adminSecretKey);
  return new TargetSavings.Client({
    networkPassphrase,
    contractId,
    rpcUrl,
    publicKey: adminKeypair.publicKey(),
  });
}
