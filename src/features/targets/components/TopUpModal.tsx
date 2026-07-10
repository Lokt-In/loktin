import { useState } from "react";
import type { TargetGoal } from "../hooks/useTargets";
import { parseUsdc } from "../../../shared/lib/money";
import DashModal from "../../../shared/dash/DashModal";
import DashButton from "../../../shared/dash/DashButton";
import AmountField from "../../../shared/dash/AmountField";

interface Props {
  goal: TargetGoal;
  balance: bigint;
  balanceFormatted: string;
  submitting: boolean;
  error: string | null;
  onConfirm: (amount: bigint) => void;
  onCancel: () => void;
}

export default function TopUpModal({
  goal,
  balance,
  balanceFormatted,
  submitting,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const [input, setInput] = useState("");
  const amount = parseUsdc(input);
  const overBalance = amount > balance;
  const valid = amount > 0n && !overBalance;

  return (
    <DashModal open onClose={onCancel} labelledBy="topup-title">
      <h2
        id="topup-title"
        className="font-heading text-[26px] font-bold text-[#eef0f7]"
      >
        Top Up Goal
      </h2>
      <p className="mt-2 font-body text-[14.5px] text-muted">
        You are about to top up “{goal.name}”.
      </p>

      <div className="mt-7">
        <AmountField
          id="topup-amount"
          label="Amount to add"
          value={input}
          onChange={setInput}
          balance={balance}
          balanceFormatted={balanceFormatted}
          showPercents
          error={
            overBalance ? "That's more than your wallet holds." : undefined
          }
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-[13px] text-red-300">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-3">
        <DashButton
          variant="primary"
          loading={submitting}
          disabled={!valid}
          onClick={() => onConfirm(amount)}
          className="w-full py-3.5"
        >
          Confirm Top up
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
