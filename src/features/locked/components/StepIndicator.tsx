const STEPS = ["Amount", "Term", "Review"] as const;

/** 1 → 2 → 3 progress rail. `current` is 1-indexed. */
export default function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center justify-center">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const reached = step <= current;
        return (
          <li key={label} className="flex items-center">
            {i > 0 && (
              <span
                aria-hidden
                className={`mx-4 block h-px w-[60px] ${
                  step <= current ? "bg-cyan" : "bg-[#ffffff24]"
                }`}
              />
            )}
            <span className="flex items-center gap-2.5">
              <span
                className={`grid h-7 w-7 place-items-center rounded-full border font-body text-[13px] font-semibold ${
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
                className={`font-body text-[15px] font-semibold ${
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
