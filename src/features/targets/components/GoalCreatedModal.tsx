import DashModal from "../../../shared/dash/DashModal";
import DashButton from "../../../shared/dash/DashButton";

interface Props {
  onView: () => void;
  onDismiss: () => void;
}

export default function GoalCreatedModal({ onView, onDismiss }: Props) {
  return (
    <DashModal open onClose={onDismiss} labelledBy="goal-created-title">
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
          id="goal-created-title"
          className="mt-6 font-heading text-[26px] font-bold text-[#eef0f7]"
        >
          Goal created
        </h2>
        <p className="mt-2 font-body text-[14.5px] text-muted">
          Your first auto-deposit is scheduled. We&apos;ll notify you as it
          lands.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3">
          <DashButton
            variant="primary"
            onClick={onView}
            className="w-full py-3.5"
          >
            View my target savings
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
