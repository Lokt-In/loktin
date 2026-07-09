import DashModal from "./DashModal";
import DashButton from "./DashButton";

interface Props {
  onViewLocks: () => void;
  onDismiss: () => void;
}

export default function SuccessModal({ onViewLocks, onDismiss }: Props) {
  return (
    <DashModal open onClose={onDismiss} labelledBy="lock-created-title">
      <div className="flex flex-col items-center text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full border border-[#34E0A16b] bg-[#34E0A114]">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="m5 13 4 4L19 7"
              stroke="#34E0A1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <h2
          id="lock-created-title"
          className="mt-6 font-heading text-[26px] font-bold text-[#eef0f7]"
        >
          Lock created
        </h2>
        <p className="mt-2 font-body text-[14.5px] text-muted">
          Your USDC is now locked and earning yield via Blend.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3">
          <DashButton
            variant="primary"
            onClick={onViewLocks}
            className="w-full py-3.5"
          >
            View my locks
          </DashButton>
          <DashButton
            variant="secondary"
            onClick={onDismiss}
            className="w-full py-3.5"
          >
            Dismiss
          </DashButton>
        </div>
      </div>
    </DashModal>
  );
}
