import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "muted";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-cyan text-[#05060a] hover:brightness-110 disabled:hover:brightness-100",
  secondary:
    "border border-[#ffffff14] bg-[#ffffff0a] text-white hover:bg-[#ffffff14]",
  // Non-interactive status chip styling for locks that can't be unlocked yet.
  muted: "border border-[#ffffff14] bg-transparent text-subtle",
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
      className={`rounded-lg px-5 py-2.5 font-body text-[14.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? "Working…" : children}
    </button>
  );
}
