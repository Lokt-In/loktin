import type { Lock } from "../hooks/useLocks";
import { lockMonths } from "../lib/lockMath";
import { formatUsdc, formatDate } from "../../../shared/lib/money";
import DashModal from "../../../shared/dash/DashModal";
import DashButton from "../../../shared/dash/DashButton";

interface Props {
  lock: Lock;
  onClose: () => void;
}

/**
 * Read-only details for a lock ("View Plan"). Mirrors the create-flow review:
 * principal, term, APY, unlock date, projected yield, and the maturity total —
 * which is `amount + projected_yield`, since the contract charges no fee.
 */
export default function LockPlanModal({ lock, onClose }: Props) {
  const months = lockMonths(lock);
  const receive = lock.amount + lock.projected_yield;

  return (
    <DashModal open onClose={onClose} labelledBy="lock-plan-title">
      <h2
        id="lock-plan-title"
        className="text-center font-heading text-[26px] font-bold text-[#eef0f7]"
      >
        View Plan
      </h2>
      <p className="mt-2 text-center font-body text-[14.5px] text-muted">
        Here are more details about your locked plan.
      </p>

      <dl className="mt-7 rounded-xl border border-[#ffffff14] bg-[#ffffff0a] px-6 py-2">
        <Row
          label="Principal locked"
          value={`${formatUsdc(lock.amount)} USDC`}
        />
        <Row label="Term" value={`${months} month${months === 1 ? "" : "s"}`} />
        <div className="flex items-center justify-between py-5">
          <dt className="font-body text-[14.5px] text-muted">APY Tier</dt>
          <dd>
            <span className="rounded-full border border-[#34E0A16b] bg-[#34E0A114] px-3 py-1.5 font-body text-[13.5px] font-semibold text-[#34E0A1]">
              {(lock.apy_basis_points / 100).toFixed(
                lock.apy_basis_points % 100 === 0 ? 0 : 1,
              )}
              % APY
            </span>
          </dd>
        </div>
        <Row label="Unlocks On" value={formatDate(lock.end_date)} />
        <Row
          label="Projected yield (gross)"
          value={`+${formatUsdc(lock.projected_yield)} USDC`}
        />
        <div className="flex items-center justify-between py-5">
          <dt className="font-body text-[14.5px] text-muted">
            You receive at maturity
          </dt>
          <dd className="font-body text-[15px] font-bold text-cyan">
            {formatUsdc(receive)} USDC
          </dd>
        </div>
      </dl>

      <DashButton
        variant="secondary"
        onClick={onClose}
        className="mt-7 w-full py-3.5"
      >
        Dismiss
      </DashButton>
    </DashModal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-5">
      <dt className="font-body text-[14.5px] text-muted">{label}</dt>
      <dd className="font-body text-[15px] font-bold text-[#eef0f7]">
        {value}
      </dd>
    </div>
  );
}
