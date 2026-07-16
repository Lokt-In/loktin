import type { TargetGoal } from "../hooks/useTargets";

// Mirrors contracts/target_savings/src/lib.rs.
const FORFEIT_BPS = 100n; // 1% on early withdrawal
const BPS_DENOMINATOR = 10_000n;
const MIN_PERIOD_SECONDS = 86_400n; // create_target rejects anything shorter

export const FREQUENCIES = [
  { label: "Weekly", periodSeconds: 604_800n, per: "week" },
  { label: "Biweekly", periodSeconds: 1_209_600n, per: "2 weeks" },
  { label: "Monthly", periodSeconds: 2_592_000n, per: "month" },
] as const;

export type Frequency = (typeof FREQUENCIES)[number]["label"];

export function frequencyOf(periodSeconds: bigint): string {
  const match = FREQUENCIES.find((f) => f.periodSeconds === periodSeconds);
  if (match) return match.label;
  const days = Number(periodSeconds) / 86_400;
  return `Every ${days}d`;
}

/**
 * `create_target` requires `86_400 <= period_seconds <= end_date - now`.
 * A weekly schedule therefore needs a deadline at least 7 days out.
 */
export function periodFits(
  periodSeconds: bigint,
  goalSeconds: bigint,
): boolean {
  return periodSeconds >= MIN_PERIOD_SECONDS && periodSeconds <= goalSeconds;
}

/** Whole deposit periods that fit before the deadline. At least 1 when the period fits. */
export function periodCount(
  periodSeconds: bigint,
  goalSeconds: bigint,
): number {
  if (!periodFits(periodSeconds, goalSeconds)) return 0;
  return Number(goalSeconds / periodSeconds);
}

/**
 * Per-period debit. Rounded *up* so the scheduled deposits reach the target by
 * the deadline — rounding down would leave the goal permanently short.
 * `create_target` rejects `period_amount <= 0`, so never return 0 for a real goal.
 */
export function periodAmount(
  targetAmount: bigint,
  periodSeconds: bigint,
  goalSeconds: bigint,
): bigint {
  const periods = periodCount(periodSeconds, goalSeconds);
  if (periods <= 0 || targetAmount <= 0n) return 0n;
  const n = BigInt(periods);
  return (targetAmount + n - 1n) / n; // ceil
}

/**
 * Total USDC the keeper will actually debit across the schedule.
 *
 * This is `period_amount * periods`, NOT `target_amount`: `period_amount` is
 * rounded up, so the schedule overshoots the target by up to one stroop per
 * period. `process_period` pulls the full `period_amount` and counts a missed
 * period whenever `allowance < period_amount`, so an allowance sized to
 * `target_amount` would starve the final deposit. Size approvals off this.
 */
export function scheduledTotal(
  targetAmount: bigint,
  periodSeconds: bigint,
  goalSeconds: bigint,
): bigint {
  const periods = periodCount(periodSeconds, goalSeconds);
  if (periods <= 0) return 0n;
  return (
    periodAmount(targetAmount, periodSeconds, goalSeconds) * BigInt(periods)
  );
}

export type TargetStatus = "on-track" | "missed" | "matured" | "withdrawn";

/**
 * `matured` means the goal has run its course — the deadline passed, or the
 * target is fully funded. `withdraw` charges no forfeit in the former case.
 */
export function targetStatus(goal: TargetGoal, nowSecs: number): TargetStatus {
  if (goal.is_complete) return "withdrawn";
  if (nowSecs >= Number(goal.end_date) || goal.deposited >= goal.target_amount)
    return "matured";
  if (goal.missed_periods > 0) return "missed";
  return "on-track";
}

/** Deadline passed ⇒ `withdraw` waives the forfeit. Mirrors `now < goal.end_date`. */
export function isEarlyWithdrawal(goal: TargetGoal, nowSecs: number): boolean {
  return nowSecs < Number(goal.end_date);
}

/**
 * Reproduces `withdraw()`'s forfeit: 1% of *principal*, and only before the
 * deadline. Integer division truncates on-chain, so keep this BigInt.
 * Yield is never forfeited.
 */
export function forfeitAmount(goal: TargetGoal, nowSecs: number): bigint {
  if (!isEarlyWithdrawal(goal, nowSecs)) return 0n;
  return (goal.deposited * FORFEIT_BPS) / BPS_DENOMINATOR;
}

/**
 * What `withdraw()` transfers: `principal - forfeit + yield`.
 *
 * The contract caps yield at what it can actually cover from idle balance plus
 * the pool, so this is the ceiling rather than a guarantee. Principal always fits.
 */
export function withdrawalPayout(
  goal: TargetGoal,
  yieldStroops: bigint,
  nowSecs: number,
): bigint {
  return goal.deposited - forfeitAmount(goal, nowSecs) + yieldStroops;
}

/**
 * Where the deposit schedule *plans* a goal to be at `atSecs`: one
 * `period_amount` per elapsed period since `start_date`, capped at
 * `target_amount`.
 *
 * This is a forecast, not a fact — it assumes every scheduled deposit lands.
 * The keeper only deposits when the wallet has the balance and allowance, so a
 * missed period leaves the real total below this line. Kept in BigInt so it
 * agrees with the on-chain figures at the endpoints.
 */
export function goalPlanValueAt(goal: TargetGoal, atSecs: number): bigint {
  const start = Number(goal.start_date);
  const end = Number(goal.end_date);
  if (atSecs <= start || goal.period_seconds <= 0n) return 0n;
  const clamped = Math.min(atSecs, end);
  const periods = BigInt(
    Math.floor((clamped - start) / Number(goal.period_seconds)),
  );
  const scheduled = goal.period_amount * periods;
  return scheduled > goal.target_amount ? goal.target_amount : scheduled;
}

export type GoalGrowthPoint = { t: number; value: bigint };

/**
 * Combined planned savings of `goals` sampled across their whole span, for the
 * projection chart. Completed goals are excluded — they're already settled and
 * would just add a flat constant.
 */
export function goalGrowthSeries(
  goals: TargetGoal[],
  samples = 80,
): GoalGrowthPoint[] {
  const active = goals.filter((g) => !g.is_complete);
  if (!active.length) return [];

  const from = Math.min(...active.map((g) => Number(g.start_date)));
  const to = Math.max(...active.map((g) => Number(g.end_date)));
  if (to <= from) return [];

  // Even grid plus each goal's start/end, so the line kinks exactly where a goal
  // enters or its deadline lands rather than rounding those corners off.
  const stamps = new Set<number>();
  for (let i = 0; i < samples; i++) {
    stamps.add(Math.round(from + ((to - from) * i) / (samples - 1)));
  }
  for (const g of active) {
    stamps.add(Number(g.start_date));
    stamps.add(Number(g.end_date));
  }

  return [...stamps]
    .sort((a, b) => a - b)
    .map((t) => ({
      t,
      value: active.reduce((sum, g) => sum + goalPlanValueAt(g, t), 0n),
    }));
}

/** 0–100, clamped. */
export function progressPct(goal: TargetGoal): number {
  if (goal.target_amount <= 0n) return 0;
  const pct = Number((goal.deposited * 10_000n) / goal.target_amount) / 100;
  return Math.max(0, Math.min(100, pct));
}
