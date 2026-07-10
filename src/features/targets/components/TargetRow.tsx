import type { TargetGoal } from "../hooks/useTargets";
import {
  frequencyOf,
  isEarlyWithdrawal,
  progressPct,
  targetStatus,
  type TargetStatus,
} from "../lib/targetMath";
import {
  formatUsdc,
  formatUsdcAdaptive,
  formatDateShort,
} from "../../../shared/lib/money";
import DashButton from "../../../shared/dash/DashButton";

const STATUS_STYLES: Record<TargetStatus, string> = {
  "on-track": "border-cyan/30 bg-cyan/10 text-cyan",
  missed: "border-red-500/40 bg-red-500/10 text-red-400",
  matured: "border-[#34E0A14D] bg-[#34E0A124] text-[#34E0A1]",
  withdrawn: "border-[#ffffff14] bg-[#ffffff0a] text-muted",
};

const STATUS_LABELS: Record<TargetStatus, string> = {
  "on-track": "On track",
  missed: "Missed",
  matured: "Matured",
  withdrawn: "Withdrawn",
};

interface Props {
  goal: TargetGoal;
  /** Display clock — may be shifted forward by the time-simulation banner. */
  nowSecs: number;
  /** True wall clock. Decides whether a withdrawal really forfeits 1%. */
  realNowSecs: number;
  onTopUp: (goal: TargetGoal) => void;
  onWithdraw: (goal: TargetGoal) => void;
}

export default function TargetRow({
  goal,
  nowSecs,
  realNowSecs,
  onTopUp,
  onWithdraw,
}: Props) {
  const status = targetStatus(goal, nowSecs);
  const pct = progressPct(goal);
  const done = status === "withdrawn";
  const matured = status === "matured";

  // The forfeit depends on `end_date` alone, never on how full the goal is — a
  // goal that hits its target early still pays 1%, and a fast-forwarded clock
  // doesn't waive it. Label the destructive action off the real clock rather
  // than off the "Matured" badge, which can be true for either reason.
  const early = isEarlyWithdrawal(goal, realNowSecs);

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-[#ffffff14] bg-[#101116] p-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan">
        {/* public/dashboard/icons/target-02.svg, inlined so stroke follows
            currentColor (the source hardcodes #8E8E93). */}
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M11.3346 7.99984C11.3346 9.84077 9.84224 11.3332 8.0013 11.3332C6.16036 11.3332 4.66797 9.84077 4.66797 7.99984C4.66797 6.15889 6.16036 4.6665 8.0013 4.6665"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M9.33203 1.46686C8.90123 1.3794 8.4553 1.3335 7.9987 1.3335C4.3168 1.3335 1.33203 4.31826 1.33203 8.00016C1.33203 11.682 4.3168 14.6668 7.9987 14.6668C11.6806 14.6668 14.6654 11.682 14.6654 8.00016C14.6654 7.54356 14.6194 7.09763 14.532 6.66683"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M8.01953 7.97493L11.0548 4.93966M13.1596 2.89634L12.7908 1.57158C12.7229 1.35333 12.4603 1.26636 12.2833 1.41101C11.3259 2.19338 10.2829 3.2472 11.1347 4.90939C12.8507 5.70963 13.8304 4.63049 14.5815 3.72346C14.731 3.54299 14.6409 3.27171 14.4158 3.20663L13.1596 2.89634Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-heading text-[19px] font-bold break-words text-[#eef0f7]">
            {goal.name}
          </p>
          <span
            className={`rounded-full border px-3 py-1 font-body text-[12.5px] font-semibold ${STATUS_STYLES[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 font-body text-[13px] text-muted">
          <span>
            {/* Adaptive: a real sub-cent deposit would read as 0.00 at 2dp and
                look like it never landed. */}
            {formatUsdcAdaptive(goal.deposited)} /{" "}
            {formatUsdc(goal.target_amount)} USDC
          </span>
          <span>
            <span className="font-semibold text-subtle">Frequency</span>{" "}
            {frequencyOf(goal.period_seconds)}
          </span>
          <span>
            <span className="font-semibold text-subtle">Deadline</span>{" "}
            {formatDateShort(goal.end_date)}
          </span>
        </div>

        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#2C2C33]"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${goal.name} progress`}
        >
          <div
            className="h-full rounded-full bg-cyan transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
        {done ? (
          <DashButton variant="muted" disabled className="w-full sm:w-auto">
            Withdrawn
          </DashButton>
        ) : matured ? (
          <DashButton
            variant={early ? "danger" : "primary"}
            onClick={() => onWithdraw(goal)}
            title={
              early
                ? `The contract charges the 1% forfeit until ${formatDateShort(goal.end_date)}.`
                : undefined
            }
            className="w-full sm:w-auto"
          >
            {early ? "Withdraw early" : "Withdraw Now"}
          </DashButton>
        ) : (
          <>
            <DashButton
              variant="secondary"
              onClick={() => onTopUp(goal)}
              className="w-full sm:w-auto"
            >
              Top Up
            </DashButton>
            <DashButton
              variant="danger"
              onClick={() => onWithdraw(goal)}
              className="w-full sm:w-auto"
            >
              Withdraw early
            </DashButton>
          </>
        )}
      </div>
    </li>
  );
}
