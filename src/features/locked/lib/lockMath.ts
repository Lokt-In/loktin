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

/**
 * What a lock is worth on paper at `atSecs`: principal plus the share of its
 * `projected_yield` accrued so far, spread linearly across the term.
 *
 * Display only. `unlock()` refuses before `end_date` (Error::LockNotMatured) and
 * then pays `amount + projected_yield` in one go, so this curve is never a
 * balance the user can withdraw early — it's the position's notional value. The
 * endpoints land exactly on the contract's numbers because the interpolation
 * stays in BigInt.
 */
export function lockValueAt(lock: Lock, atSecs: number): bigint {
  const start = Number(lock.start_date);
  const end = Number(lock.end_date);
  // Before it was created the lock contributes nothing. Returning `amount` here
  // would back-date the principal, drawing a portfolio you didn't hold yet.
  if (atSecs < start) return 0n;
  if (end <= start || atSecs >= end) return lock.amount + lock.projected_yield;
  return (
    lock.amount +
    (lock.projected_yield * BigInt(atSecs - start)) / BigInt(end - start)
  );
}

export type GrowthPoint = { t: number; value: bigint };

/**
 * Combined notional value of `locks` sampled across their whole span, for the
 * projected-growth chart. Unlocked locks are excluded: they're already paid out
 * and would flatten the curve with a constant.
 */
export function projectedGrowthSeries(
  locks: Lock[],
  samples = 80,
): GrowthPoint[] {
  const active = locks.filter((l) => !l.is_unlocked);
  if (!active.length) return [];

  const from = Math.min(...active.map((l) => Number(l.start_date)));
  const to = Math.max(...active.map((l) => Number(l.end_date)));
  if (to <= from) return [];

  // Even samples, plus every start/end. The curve kinks each time a lock starts
  // or matures; without the exact breakpoints the sampling grid rounds those
  // corners off and the line lies slightly about when growth stops.
  const stamps = new Set<number>();
  for (let i = 0; i < samples; i++) {
    stamps.add(Math.round(from + ((to - from) * i) / (samples - 1)));
  }
  for (const l of active) {
    stamps.add(Number(l.start_date));
    stamps.add(Number(l.end_date));
  }

  return [...stamps]
    .sort((a, b) => a - b)
    .map((t) => ({
      t,
      value: active.reduce((sum, l) => sum + lockValueAt(l, t), 0n),
    }));
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
