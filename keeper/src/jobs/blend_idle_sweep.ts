import {
  Keypair,
  Contract,
  Address,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  rpc as StellarRpc,
} from "@stellar/stellar-sdk";
import { withRetry } from "../core/retry.js";

/**
 * Job: move idle USDC sitting in each savings contract into the (mock) Blend pool
 * so it earns yield. For each target contract we read its USDC balance and, if it's
 * at or above `minSweep`, call `deposit_to_blend(amount)` (signed by the admin/keeper).
 *
 * The cross-contract auth for the nested token transfer is handled inside the
 * contract via `authorize_as_current_contract`, so the keeper only needs to provide
 * the admin's source-account signature.
 *
 * Default schedule: every 6 hours.
 */

export type SweepTarget = { name: string; contractId: string };

export type BlendSweepConfig = {
  targets: SweepTarget[];
  usdcSac: string;
  rpcUrl: string;
  networkPassphrase: string;
  adminKeypair: Keypair;
  minSweep: bigint;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function readUsdcBalance(
  server: StellarRpc.Server,
  usdcSac: string,
  account: string,
  sourcePublicKey: string,
  networkPassphrase: string,
): Promise<bigint> {
  const op = new Contract(usdcSac).call(
    "balance",
    new Address(account).toScVal(),
  );
  const source = await server.getAccount(sourcePublicKey);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if ("result" in sim && sim.result?.retval) {
    const v = scValToNative(sim.result.retval) as bigint | number | string;
    return typeof v === "bigint" ? v : BigInt(v ?? 0);
  }
  return 0n;
}

async function depositToBlend(
  server: StellarRpc.Server,
  contractId: string,
  amount: bigint,
  admin: Keypair,
  networkPassphrase: string,
): Promise<void> {
  const op = new Contract(contractId).call(
    "deposit_to_blend",
    nativeToScVal(amount, { type: "i128" }),
  );
  const source = await server.getAccount(admin.publicKey());
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(admin);
  const sent = await server.sendTransaction(prepared);

  if (sent.status === "DUPLICATE") return; // already submitted earlier — fine
  if (sent.status !== "PENDING") {
    throw new Error(`deposit_to_blend send ${sent.status}`);
  }
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    const res = await server.getTransaction(sent.hash);
    if (res.status === "SUCCESS") return;
    if (res.status === "FAILED")
      throw new Error(`deposit_to_blend FAILED (${sent.hash})`);
  }
  throw new Error(`deposit_to_blend timed out (${sent.hash})`);
}

export async function runBlendIdleSweep(cfg?: BlendSweepConfig) {
  console.log("\n[blend_idle_sweep] Running…");
  if (!cfg) {
    console.log("[blend_idle_sweep] No config — skipping.");
    return { swept: 0 };
  }

  const server = new StellarRpc.Server(cfg.rpcUrl, {
    allowHttp: cfg.rpcUrl.startsWith("http://"),
  });
  const source = cfg.adminKeypair.publicKey();
  let swept = 0;

  for (const target of cfg.targets) {
    try {
      const idle = await withRetry(`balance(${target.name})`, () =>
        readUsdcBalance(
          server,
          cfg.usdcSac,
          target.contractId,
          source,
          cfg.networkPassphrase,
        ),
      );
      if (idle < cfg.minSweep) {
        console.log(
          `  • ${target.name}: ${Number(idle) / 1e7} USDC idle — below threshold, skip`,
        );
        continue;
      }
      await depositToBlend(
        server,
        target.contractId,
        idle,
        cfg.adminKeypair,
        cfg.networkPassphrase,
      );
      swept++;
      console.log(
        `  ✓ ${target.name}: swept ${Number(idle) / 1e7} USDC into the pool`,
      );
    } catch (err) {
      console.error(
        `  ✗ ${target.name} sweep failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(`[blend_idle_sweep] Done — ${swept} contract(s) swept`);
  return { swept };
}
