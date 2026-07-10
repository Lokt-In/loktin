import type { TargetGoal } from "../hooks/useTargets";
import {
  forfeitAmount,
  isEarlyWithdrawal,
  withdrawalPayout,
} from "../lib/targetMath";
import { formatUsdcAdaptive, formatDate } from "../../../shared/lib/money";
import DashModal from "../../../shared/dash/DashModal";
import DashButton from "../../../shared/dash/DashButton";
import Spinner from "../../../shared/dash/Spinner";

interface Props {
  goal: TargetGoal;
  /** Live yield from `get_goal_yield`; null while loading. */
  goalYield: bigint | null;
  /** True wall clock. Every figure here is computed from this, never the simulated clock. */
  realNowSecs: number;
  /** Goal reads as matured only because the display clock was fast-forwarded. */
  simulatedOnly: boolean;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Payout breakdown for `withdraw()`, which pays `principal - forfeit + yield`
 * and closes the goal. The 1% forfeit applies only before the deadline; yield
 * is never forfeited, so it gets its own line either way — the design omits it,
 * but leaving it out would understate what actually lands in the wallet.
 *
 * Everything is computed from the *real* clock. `withdraw` doesn't revert early,
 * it just deducts — so pricing this off a fast-forwarded clock would hide a real
 * 1% loss behind a "Matured" badge.
 */
export default function WithdrawModal({
  goal,
  goalYield,
  realNowSecs,
  simulatedOnly,
  submitting,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const early = isEarlyWithdrawal(goal, realNowSecs);
  const forfeit = forfeitAmount(goal, realNowSecs);
  const loadingYield = goalYield === null;
  const earned = goalYield ?? 0n;
  const receive = withdrawalPayout(goal, earned, realNowSecs);

  return (
    <DashModal open onClose={onCancel} labelledBy="withdraw-title">
      <h2
        id="withdraw-title"
        className="text-center font-heading text-[26px] font-bold text-[#eef0f7]"
      >
        {early ? "Withdraw early" : "Withdraw"}
      </h2>
      <p className="mt-2 text-center font-body text-[14.5px] text-muted">
        {early
          ? "This goal hasn't reached its deadline. Here's your payout breakdown."
          : "This goal has reached its deadline. Here's your payout breakdown."}
      </p>

      <dl className="mt-7 rounded-xl border border-[#ffffff14] bg-[#ffffff0a] px-6 py-2">
        <div className="flex items-center justify-between gap-6 py-5">
          <dt className="font-body text-[14.5px] text-muted">Saved so far</dt>
          <dd className="shrink-0 font-body text-[15px] font-bold text-[#eef0f7]">
            {formatUsdcAdaptive(goal.deposited)} USDC
          </dd>
        </div>

        {early && (
          <div className="flex items-center justify-between gap-6 py-5">
            <dt className="font-body text-[14.5px] text-muted">
              Early-exit forfeit (1%)
            </dt>
            <dd className="shrink-0 font-body text-[15px] font-bold text-red-400">
              -{formatUsdcAdaptive(forfeit)} USDC
            </dd>
          </div>
        )}

        <div className="flex items-center justify-between gap-6 py-5">
          <dt className="font-body text-[14.5px] text-muted">Yield earned</dt>
          <dd className="shrink-0 font-body text-[15px] font-bold text-[#eef0f7]">
            {loadingYield ? (
              <Spinner className="h-4 w-4 text-muted" />
            ) : (
              `+${formatUsdcAdaptive(earned)} USDC`
            )}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-6 border-t border-[#ffffff14] py-5">
          <dt className="font-body text-[14.5px] text-muted">You receive</dt>
          <dd className="shrink-0 font-body text-[15px] font-bold text-cyan">
            {loadingYield ? "—" : `${formatUsdcAdaptive(receive)} USDC`}
          </dd>
        </div>
      </dl>

      {simulatedOnly && (
        <p className="mt-4 rounded-lg border border-cyan/25 bg-cyan/[0.06] px-4 py-3 font-body text-[13px] text-subtle">
          This goal only reads as matured because the display clock was
          fast-forwarded. The contract goes by the ledger, so withdrawing now
          would still forfeit 1%. It matures on {formatDate(goal.end_date)}.
        </p>
      )}

      {early && !simulatedOnly && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/[0.06] px-4 py-3 font-body text-[13px] text-red-300">
          Withdrawing now forfeits 1% of what you&apos;ve saved and closes the
          goal for good. It can&apos;t be resumed.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-[13px] text-red-300">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-3">
        <DashButton
          variant={early ? "danger" : "primary"}
          loading={submitting}
          // Blocked under simulation: `withdraw` would succeed and quietly take
          // the 1% the badge says isn't owed. Reset the clock to withdraw early
          // deliberately.
          disabled={loadingYield || simulatedOnly}
          title={
            simulatedOnly
              ? `Preview only — reset the simulated clock to withdraw early.`
              : undefined
          }
          onClick={onConfirm}
          className="w-full py-3.5"
        >
          Confirm Withdraw
        </DashButton>
        <DashButton
          variant="secondary"
          disabled={submitting}
          onClick={onCancel}
          className="w-full py-3.5"
        >
          Cancel
        </DashButton>
      </div>
    </DashModal>
  );
}
