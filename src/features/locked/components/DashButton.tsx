import type { ButtonHTMLAttributes, ReactNode } from "react";
import Spinner from "./Spinner";

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
