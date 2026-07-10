import { STROOPS } from "../lib/money";

const PERCENTS = [
  { label: "25%", frac: 25n },
  { label: "50%", frac: 50n },
  { label: "75%", frac: 75n },
  { label: "Max", frac: 100n },
];

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Wallet balance in stroops; drives the percent shortcuts. */
  balance?: bigint;
  /** Pre-formatted balance for the caption. Omit to hide the caption. */
  balanceFormatted?: string;
  /** 25/50/75/Max shortcuts. Requires `balance`. */
  showPercents?: boolean;
  error?: string | null;
  placeholder?: string;
}

/**
 * USDC amount input with optional percent-of-balance shortcuts.
 *
 * Only digits and a single dot are accepted, so the value always survives
 * `parseUsdc`. Preflight is off in this project, so the native input keeps its
 * UA border/background and would draw a second box inside the wrapper's chrome
 * — reset on the element, not globally (a blanket `appearance: none` strips the
 * native track off SpendSave's range input).
 */
export default function AmountField({
  id,
  label,
  value,
  onChange,
  balance,
  balanceFormatted,
  showPercents = false,
  error,
  placeholder = "0.00",
}: Props) {
  const setPercent = (frac: bigint) => {
    if (balance === undefined) return;
    const raw = (balance * frac) / 100n;
    // Trim to 2dp so the field shows what the user sees everywhere else.
    const trimmed = (raw / (STROOPS / 100n)) * (STROOPS / 100n);
    onChange((Number(trimmed) / Number(STROOPS)).toFixed(2));
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block font-body text-[13px] font-semibold tracking-[0.06em] text-[#eef0f7] uppercase"
      >
        {label}
      </label>
      <div className="mt-3 flex min-h-[74px] items-center rounded-xl border border-[#ffffff14] bg-surface px-5 py-4">
        <input
          id={id}
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^\d*\.?\d*$/.test(v)) onChange(v);
          }}
          className="w-full min-w-0 appearance-none border-0 bg-transparent font-mono text-[17px] text-white outline-none placeholder:text-muted"
        />
        <span className="ml-4 font-mono text-[15px] text-subtle">USDC</span>
      </div>

      {showPercents && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PERCENTS.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={!balance}
              onClick={() => setPercent(p.frac)}
              className="rounded-lg border border-[#ffffff14] bg-[#ffffff08] py-3 font-body text-[14px] font-semibold text-subtle transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {balanceFormatted !== undefined && (
        <div className="mt-5 flex items-center justify-between font-body text-[14px]">
          <span className="font-semibold text-muted">Wallet balance</span>
          <span className="font-semibold text-[#eef0f7]">
            {balanceFormatted} USDC
          </span>
        </div>
      )}

      {error && (
        <p className="mt-3 font-body text-[13px] text-red-400">{error}</p>
      )}
    </div>
  );
}
