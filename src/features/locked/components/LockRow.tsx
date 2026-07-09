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
    <li className="flex flex-col gap-4 rounded-2xl border border-[#ffffff14] bg-[#101116] p-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan">
        {/* public/dashboard/icons/lock-password.svg, inlined so stroke follows
            currentColor (the source hardcodes #1A98AD). */}
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M2.84651 12.5631C2.99643 13.6767 3.91872 14.549 5.04108 14.6006C5.98548 14.644 6.94484 14.6667 8.0013 14.6667C9.05777 14.6667 10.0171 14.644 10.9615 14.6006C12.0839 14.549 13.0062 13.6767 13.1561 12.5631C13.254 11.8365 13.3346 11.0917 13.3346 10.3333C13.3346 9.57493 13.254 8.8302 13.1561 8.10353C13.0062 6.99 12.0839 6.11766 10.9615 6.06606C10.0171 6.02265 9.05777 6 8.0013 6C6.94484 6 5.98548 6.02265 5.04108 6.06606C3.91872 6.11766 2.99643 6.99 2.84651 8.10353C2.74867 8.8302 2.66797 9.57493 2.66797 10.3333C2.66797 11.0917 2.74867 11.8365 2.84651 12.5631Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 6.00016V4.3335C5 2.67664 6.34315 1.3335 8 1.3335C9.65687 1.3335 11 2.67664 11 4.3335V6.00016"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.08203 10.3332H7.9987M8.16536 10.3332C8.16536 10.4252 8.09076 10.4998 7.9987 10.4998C7.90663 10.4998 7.83203 10.4252 7.83203 10.3332C7.83203 10.2411 7.90663 10.1665 7.9987 10.1665C8.09076 10.1665 8.16536 10.2411 8.16536 10.3332Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.41797 10.3332H5.33464M5.5013 10.3332C5.5013 10.4252 5.42668 10.4998 5.33464 10.4998C5.24259 10.4998 5.16797 10.4252 5.16797 10.3332C5.16797 10.2411 5.24259 10.1665 5.33464 10.1665C5.42668 10.1665 5.5013 10.2411 5.5013 10.3332Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.75 10.3332H10.6667M10.8333 10.3332C10.8333 10.4252 10.7587 10.4998 10.6667 10.4998C10.5746 10.4998 10.5 10.4252 10.5 10.3332C10.5 10.2411 10.5746 10.1665 10.6667 10.1665C10.7587 10.1665 10.8333 10.2411 10.8333 10.3332Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-heading text-[19px] font-bold text-[#eef0f7]">
            {formatUsdc(lock.amount)} USDC · {months}mo lock
          </p>
          <span
            className={`rounded-full border px-3 py-1 font-body text-[12.5px] font-semibold ${STATUS_STYLES[status]}`}
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
          <DashButton
            variant="primary"
            onClick={() => onUnlock(lock)}
            className="w-full sm:w-auto"
          >
            Unlock Now
          </DashButton>
        ) : status === "locked" ? (
          <DashButton variant="muted" disabled className="w-full sm:w-auto">
            Locked · {timeLeftLabel(lock, nowSecs)}
          </DashButton>
        ) : (
          <DashButton variant="muted" disabled className="w-full sm:w-auto">
            Withdrawn
          </DashButton>
        )}
      </div>
    </li>
  );
}
