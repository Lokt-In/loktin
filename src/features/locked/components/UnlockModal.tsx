import type { Lock } from "../hooks/useLocks";
import { formatUsdc, formatDate } from "../lib/lockMath";
import DashModal from "./DashModal";
import DashButton from "./DashButton";

interface Props {
  lock: Lock;
  submitting: boolean;
  error: string | null;
  /** Lock reads as matured only because the display clock was fast-forwarded. */
  simulatedOnly: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Payout breakdown for a matured lock. The contract transfers
 * `amount + projected_yield` and deducts nothing, so "You receive" is their
 * sum — there is no fee line because no fee is charged on-chain.
 */
export default function UnlockModal({
  lock,
  submitting,
  error,
  simulatedOnly,
  onConfirm,
  onCancel,
}: Props) {
  const receive = lock.amount + lock.projected_yield;

  const rows = [
    { label: "Principal locked", value: `${formatUsdc(lock.amount)} USDC` },
    {
      label: "Projected yield",
      value: `+${formatUsdc(lock.projected_yield)} USDC`,
    },
  ];

  return (
    <DashModal open onClose={onCancel} labelledBy="unlock-title">
      <h2
        id="unlock-title"
        className="text-center font-heading text-[26px] font-bold text-[#eef0f7]"
      >
        Unlock Funds
      </h2>
      <p className="mt-2 text-center font-body text-[14.5px] text-muted">
        {simulatedOnly
          ? "Preview under simulated time. Here's your payout breakdown."
          : "This lock has matured. Here's your payout breakdown."}
      </p>

      <dl className="mt-7 rounded-xl border border-[#ffffff14] bg-[#ffffff0a] px-6 py-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between py-5 "
          >
            <dt className="font-body text-[14.5px] text-muted">{r.label}</dt>
            <dd className="font-body text-[15px] font-bold text-[#eef0f7]">
              {r.value}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between py-5">
          <dt className="font-body text-[14.5px] text-muted">You receive</dt>
          <dd className="font-body text-[15px] font-bold text-cyan">
            {formatUsdc(receive)} USDC
          </dd>
        </div>
      </dl>

      {simulatedOnly && (
        <p className="mt-4 rounded-lg border border-cyan/25 bg-cyan/[0.06] px-4 py-3 font-body text-[13px] text-subtle">
          This lock only reads as matured because the display clock was
          fast-forwarded. The contract checks the ledger timestamp, so it
          won&apos;t release these funds until {formatDate(lock.end_date)}.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-[13px] text-red-300">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-3">
        <DashButton
          variant="primary"
          loading={submitting}
          disabled={simulatedOnly}
          title={
            simulatedOnly
              ? `The contract unlocks this on ${formatDate(lock.end_date)}.`
              : undefined
          }
          onClick={onConfirm}
          className="w-full py-3.5"
        >
          Confirm Unlock
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
