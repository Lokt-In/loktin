import type { Lock } from "../hooks/useLocks";

// Mirrors contracts/locked_in/src/lib.rs — a month is a flat 30 days there, and
// a year is 365 days. Do not "fix" these to calendar values: the preview would
// stop matching what the contract stores.
const SECONDS_PER_MONTH = 2_592_000n;
const SECONDS_PER_YEAR = 31_536_000n;
const BPS_DENOMINATOR = 10_000n;

export function durationSeconds(months: number): bigint {
  return BigInt(months) * SECONDS_PER_MONTH;
}

/**
 * Reproduces `lock()`'s projected_yield exactly:
 *
 *   amount * apy_bps / 10_000 * duration_seconds / SECONDS_PER_YEAR
 *
 * Integer division truncates at each step on-chain, so this must stay BigInt
 * and keep the same operation order — a float version drifts by a stroop or two
 * and the Review screen would promise a number the contract never stores.
 */
export function projectedYield(
  amountStroops: bigint,
  apyBps: number,
  months: number,
): bigint {
  if (amountStroops <= 0n || apyBps <= 0 || months <= 0) return 0n;
  return (
    (((amountStroops * BigInt(apyBps)) / BPS_DENOMINATOR) *
      durationSeconds(months)) /
    SECONDS_PER_YEAR
  );
}

export type LockStatus = "locked" | "matured" | "unlocked";

export function lockStatus(lock: Lock, nowSecs: number): LockStatus {
  if (lock.is_unlocked) return "unlocked";
  return nowSecs >= Number(lock.end_date) ? "matured" : "locked";
}

/** Whole months a lock ran for, per the contract's 30-day month. */
export function lockMonths(lock: Lock): number {
  return Math.round(Number(lock.duration_seconds) / Number(SECONDS_PER_MONTH));
}

/** "92d left" / "14h left" / "Matured" */
export function timeLeftLabel(lock: Lock, nowSecs: number): string {
  const secondsLeft = Number(lock.end_date) - nowSecs;
  if (secondsLeft <= 0) return "Matured";
  const days = Math.floor(secondsLeft / 86_400);
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(secondsLeft / 3_600);
  if (hours > 0) return `${hours}h left`;
  return `${Math.max(1, Math.floor(secondsLeft / 60))}m left`;
}
