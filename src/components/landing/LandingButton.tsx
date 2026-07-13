import type { ReactNode } from "react";

interface Props {
  variant?: "primary" | "secondary";
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}

/**
 * Landing button (dark theme) — solid cyan (primary) with a soft glow, or a
 * subtle outline (secondary). Renders an <a> when `href` is set.
 */
const BASE =
  "inline-flex items-center justify-center rounded-[10px] px-6 py-3 font-body text-[15px] font-semibold cursor-pointer transition-all";

const VARIANTS = {
  primary:
    "bg-cyan text-ink shadow-[0_10px_40px_-10px_rgba(34,211,238,0.7)] hover:brightness-105",
  secondary:
    "border border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08]",
};

export default function LandingButton({
  variant = "primary",
  onClick,
  href,
  children,
}: Props) {
  const cls = `${BASE} ${VARIANTS[variant]}`;
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
