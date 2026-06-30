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
 * Job: keep the (mock) Blend pool able to pay accrued yield. The pool's free
 * buffer = its USDC balance minus what it owes suppliers (sum of positions). If
 * that buffer drops below `reserveMin`, the admin tops it up toward
 * `reserveTarget` via `fund_reserve` — never spending admin USDC below `adminKeep`.
 *
 * This is a testnet demo safety net; on real Blend the pool funds yield from
 * borrower interest and there's nothing to top up.
 */

export type ReserveTopUpConfig = {
  poolId: string;
  supplierContractIds: string[]; // savings contracts that hold pool positions
  usdcSac: string;
  rpcUrl: string;
  networkPassphrase: string;
  adminKeypair: Keypair;
  reserveMin: bigint;
  reserveTarget: bigint;
  adminKeep: bigint;
};

const usdc = (n: bigint) => (Number(n) / 1e7).toFixed(2);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function simI128(
  server: StellarRpc.Server,
  contractId: string,
  method: string,
  args: ReturnType<Address["toScVal"]>[],
  sourcePublicKey: string,
  networkPassphrase: string,
): Promise<bigint> {
  const op = new Contract(contractId).call(method, ...args);
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

async function fundReserve(
  server: StellarRpc.Server,
  poolId: string,
  amount: bigint,
  admin: Keypair,
  networkPassphrase: string,
): Promise<void> {
  const op = new Contract(poolId).call(
    "fund_reserve",
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
  if (sent.status === "DUPLICATE") return;
  if (sent.status !== "PENDING")
    throw new Error(`fund_reserve send ${sent.status}`);
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    const res = await server.getTransaction(sent.hash);
    if (res.status === "SUCCESS") return;
    if (res.status === "FAILED")
      throw new Error(`fund_reserve FAILED (${sent.hash})`);
  }
  throw new Error(`fund_reserve timed out (${sent.hash})`);
}

export async function runReserveTopUp(cfg?: ReserveTopUpConfig) {
  console.log("\n[reserve_top_up] Running…");
  if (!cfg) {
    console.log("[reserve_top_up] No config — skipping.");
    return { topped: 0n };
  }
  const server = new StellarRpc.Server(cfg.rpcUrl, {
    allowHttp: cfg.rpcUrl.startsWith("http://"),
  });
  const src = cfg.adminKeypair.publicKey();

  try {
    const reserve = await withRetry("reserve_balance", () =>
      simI128(
        server,
        cfg.poolId,
        "reserve_balance",
        [],
        src,
        cfg.networkPassphrase,
      ),
    );
    let owed = 0n;
    for (const c of cfg.supplierContractIds) {
      owed += await withRetry(`get_position(${c.slice(0, 6)}…)`, () =>
        simI128(
          server,
          cfg.poolId,
          "get_position",
          [new Address(c).toScVal()],
          src,
          cfg.networkPassphrase,
        ),
      );
    }
    const buffer = reserve - owed;
    console.log(
      `  reserve ${usdc(reserve)} − owed ${usdc(owed)} = free buffer ${usdc(buffer)} USDC`,
    );
    if (buffer >= cfg.reserveMin) {
      console.log("  buffer healthy — no top-up");
      return { topped: 0n };
    }

    const adminBal = await withRetry("admin balance", () =>
      simI128(
        server,
        cfg.usdcSac,
        "balance",
        [new Address(src).toScVal()],
        src,
        cfg.networkPassphrase,
      ),
    );
    const needed = cfg.reserveTarget - buffer;
    const spendable = adminBal - cfg.adminKeep;
    const topUp = needed < spendable ? needed : spendable;
    if (topUp <= 0n) {
      console.log(
        `  buffer low (${usdc(buffer)}) but admin USDC (${usdc(adminBal)}) too low to top up`,
      );
      return { topped: 0n };
    }

    await fundReserve(
      server,
      cfg.poolId,
      topUp,
      cfg.adminKeypair,
      cfg.networkPassphrase,
    );
    console.log(`  ✓ topped up reserve by ${usdc(topUp)} USDC`);
    return { topped: topUp };
  } catch (err) {
    console.error(
      "  reserve top-up failed:",
      err instanceof Error ? err.message : err,
    );
    return { topped: 0n };
  }
}
