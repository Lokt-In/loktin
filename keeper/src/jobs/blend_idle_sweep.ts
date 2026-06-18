/**
 * Job (STUB): periodically move idle USDC from each savings contract into Blend.
 *
 * Today: this is a no-op placeholder. The savings contracts each expose
 * `deposit_to_blend()` as a stub that emits an event.
 *
 * When Blend is integrated:
 *   - Read each contract's `pool_balance()` (idle USDC)
 *   - If above a threshold (e.g. 50 USDC), call `deposit_to_blend(amount)`
 *     which routes the USDC into Blend's pool contract
 *   - Track the new `blend_position()` per contract
 *
 * Default schedule (suggested): every 6 hours.
 */

export async function runBlendIdleSweep() {
  console.log("\n[blend_idle_sweep] Running… (stub: Blend not yet integrated)");
  // TODO when Blend is live:
  //   for each contract in [target_savings, locked_in, spend_save]:
  //     const idle = await getIdleBalance(contract)
  //     if (idle > threshold) await contract.deposit_to_blend({ amount: idle })
  console.log("[blend_idle_sweep] Done — no-op");
  return { swept: 0 };
}
