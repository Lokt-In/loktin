interface Props<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

/** Rounded segmented filter. Scrolls horizontally on narrow screens. */
export default function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <div className="no-scrollbar -mx-4 mt-10 flex items-center gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`shrink-0 rounded-full border px-6 py-2.5 font-body text-[14px] transition-colors ${
            value === o
              ? "border-cyan/40 bg-cyan/10 text-cyan"
              : "border-[#ffffff14] bg-[#101116] text-muted hover:text-white"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
