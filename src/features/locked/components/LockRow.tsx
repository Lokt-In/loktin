import type { Lock } from "../hooks/useLocks";
import {
  formatUsdc,
  formatDateShort,
  lockMonths,
  lockStatus,
  timeLeftLabel,
} from "../lib/lockMath";
import DashButton from "./DashButton";

const STATUS_STYLES = {
  locked: "border-cyan/30 bg-cyan/10 text-cyan",
  matured: "border-[#34E0A14D] bg-[#34E0A124] text-[#34E0A1]",
  unlocked: "border-[#ffffff14] bg-[#ffffff0a] text-muted",
} as const;

const STATUS_LABELS = {
  locked: "Locked",
  matured: "Matured",
  unlocked: "Unlocked",
} as const;

interface Props {
  lock: Lock;
  nowSecs: number;
  onUnlock: (lock: Lock) => void;
}

export default function LockRow({ lock, nowSecs, onUnlock }: Props) {
  const status = lockStatus(lock, nowSecs);
  const months = lockMonths(lock);

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-[#ffffff14] bg-[#ffffff0a] p-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="4"
            y="10"
            width="16"
            height="11"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 10V7a4 4 0 1 1 8 0v3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-heading text-[19px] font-bold text-[#eef0f7]">
            {formatUsdc(lock.amount)} USDC · {months}mo lock
          </p>
          <span
            className={`rounded-md border px-2.5 py-1 font-body text-[12.5px] font-semibold ${STATUS_STYLES[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 font-body text-[13px] text-muted">
          <span>
            <span className="font-semibold text-subtle">APY</span>{" "}
            {(lock.apy_basis_points / 100).toFixed(1)}%
          </span>
          <span>
            <span className="font-semibold text-subtle">Projected yield</span> +
            {formatUsdc(lock.projected_yield, 2)} USDC
          </span>
          <span>
            Unlocks on{" "}
            <span className="font-semibold text-subtle">
              {formatDateShort(lock.end_date)}
            </span>
          </span>
        </div>
      </div>

      <div className="shrink-0">
        {status === "matured" ? (
          <DashButton variant="primary" onClick={() => onUnlock(lock)}>
            Unlock Now
          </DashButton>
        ) : status === "locked" ? (
          <DashButton variant="muted" disabled>
            Locked · {timeLeftLabel(lock, nowSecs)}
          </DashButton>
        ) : (
          <DashButton variant="muted" disabled>
            Withdrawn
          </DashButton>
        )}
      </div>
    </li>
  );
}
