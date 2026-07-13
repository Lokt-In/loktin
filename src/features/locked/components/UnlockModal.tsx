import type { Lock } from "../hooks/useLocks";
import { formatUsdc } from "../../../shared/lib/money";
import DashModal from "../../../shared/dash/DashModal";
import DashButton from "../../../shared/dash/DashButton";

interface Props {
  lock: Lock;
  submitting: boolean;
  error: string | null;
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
        This lock has matured. Here&apos;s your payout breakdown.
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

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-[13px] text-red-300">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-3">
        <DashButton
          variant="primary"
          loading={submitting}
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
