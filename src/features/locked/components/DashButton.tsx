import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "muted";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-cyan text-[#05060a] hover:brightness-110 disabled:hover:brightness-100 disabled:opacity-60",
  secondary:
    "border border-[#ffffff14] bg-[#ffffff0a] text-white hover:bg-[#ffffff14] disabled:opacity-60",
  // Non-interactive status chip for locks that can't be unlocked yet. It is
  // always disabled, so it carries no dimming — the palette is the resting look.
  muted: "border border-[#2C2C33] bg-[#1A1B23] text-subtle",
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DashButton({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-body text-[14.5px] font-semibold transition disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
