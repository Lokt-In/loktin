import type { TargetGoal } from "../hooks/useTargets";
import {
  frequencyOf,
  isEarlyWithdrawal,
  targetStatus,
} from "../lib/targetMath";
import {
  formatUsdc,
  formatUsdcAdaptive,
  formatDate,
} from "../../../shared/lib/money";
import DashModal from "../../../shared/dash/DashModal";
import DashButton from "../../../shared/dash/DashButton";

interface Props {
  goal: TargetGoal;
  nowSecs: number;
  /** Open the withdraw payout modal for this goal. */
  onWithdraw: (goal: TargetGoal) => void;
  onClose: () => void;
}

/**
 * Read-only details for a goal ("View Plan"), and the entry point for
 * withdrawing — the row itself only offers Top Up. Withdrawing before the
 * deadline forfeits 1%, so that button is red and leads to the payout modal.
 */
export default function GoalPlanModal({
  goal,
  nowSecs,
  onWithdraw,
  onClose,
}: Props) {
  const status = targetStatus(goal, nowSecs);
  const early = isEarlyWithdrawal(goal, nowSecs);
  const withdrawn = status === "withdrawn";

  return (
    <DashModal open onClose={onClose} labelledBy="goal-plan-title">
      <h2
        id="goal-plan-title"
        className="text-center font-heading text-[26px] font-bold text-[#eef0f7]"
      >
        View Plan
      </h2>
      <p className="mt-2 text-center font-body text-[14.5px] text-muted">
        Here are more details about your target savings.
      </p>

      <dl className="mt-7 rounded-xl border border-[#ffffff14] bg-[#ffffff0a] px-6 py-2">
        <Row label="Goal" value={goal.name} />
        <Row
          label="Goal Amount"
          value={`${formatUsdc(goal.target_amount)} USDC`}
        />
        <Row
          label="Saved so far"
          value={`${formatUsdcAdaptive(goal.deposited)} USDC`}
        />
        <Row label="Deadline" value={formatDate(goal.end_date)} />
        <Row label="Frequency" value={frequencyOf(goal.period_seconds)} />
        <div className="flex items-center justify-between gap-4 py-5">
          <dt className="font-body text-[14.5px] text-muted">
            Per deposit amount
          </dt>
          <dd className="text-right font-body text-[15px] font-bold text-cyan">
            {formatUsdc(goal.period_amount)} USDC
          </dd>
        </div>
      </dl>

      <div className="mt-7 flex flex-col gap-3">
        {!withdrawn && (
          <DashButton
            variant={early ? "danger" : "primary"}
            onClick={() => onWithdraw(goal)}
            className="w-full py-3.5"
          >
            {early ? "Withdraw early" : "Withdraw Now"}
          </DashButton>
        )}
        <DashButton
          variant="secondary"
          onClick={onClose}
          className="w-full py-3.5"
        >
          Dismiss
        </DashButton>
      </div>
    </DashModal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-5">
      <dt className="font-body text-[14.5px] text-muted">{label}</dt>
      <dd className="text-right font-body text-[15px] font-bold break-words text-[#eef0f7]">
        {value}
      </dd>
    </div>
  );
}
