interface Props {
  /** Step labels, in order. */
  steps: readonly string[];
  /** 1-indexed current step. */
  current: number;
}

/** 1 → 2 → … progress rail for the create wizards. Scrolls rather than wraps
 *  on narrow screens, since four labelled steps don't fit at 360px. */
export default function StepIndicator({ steps, current }: Props) {
  return (
    <ol className="no-scrollbar -mx-4 flex items-center overflow-x-auto px-4 sm:mx-0 sm:justify-center sm:px-0">
      {steps.map((label, i) => {
        const step = i + 1;
        const reached = step <= current;
        return (
          <li key={label} className="flex shrink-0 items-center">
            {i > 0 && (
              <span
                aria-hidden
                className={`mx-2 block h-px w-6 sm:mx-4 sm:w-[60px] ${
                  step <= current ? "bg-cyan" : "bg-[#ffffff24]"
                }`}
              />
            )}
            <span className="flex items-center gap-1.5 sm:gap-2.5">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border font-body text-[13px] font-semibold ${
                  step === current
                    ? "border-cyan bg-cyan/15 text-cyan"
                    : reached
                      ? "border-cyan bg-cyan text-[#05060a]"
                      : "border-[#ffffff2e] text-muted"
                }`}
              >
                {step}
              </span>
              <span
                className={`font-body text-[13px] font-semibold whitespace-nowrap sm:text-[15px] ${
                  reached ? "text-white" : "text-muted"
                }`}
              >
                {label}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
