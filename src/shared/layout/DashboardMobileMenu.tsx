import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import Wordmark from "../components/Wordmark";
import WalletPill from "./WalletPill";

export interface DashNavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

interface Props {
  open: boolean;
  links: DashNavItem[];
  comingSoon: { label: string; icon: ReactNode }[];
  onClose: () => void;
}

/**
 * Full-screen dashboard nav for mobile: logo + close at the top, the routed
 * links (with active state) stacked below, and the wallet pill pinned at the
 * bottom. Portaled to <body> so the sticky header's `backdrop-blur` doesn't
 * become the containing block for this `fixed` overlay, and given `lk-theme`
 * so the rounded surfaces survive base.css's sharp-edge rule.
 */
export default function DashboardMobileMenu({
  open,
  links,
  comingSoon,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="lk-theme fixed inset-0 z-[200] flex flex-col bg-ink font-body text-white md:hidden"
    >
      <div className="flex h-[72px] shrink-0 items-center justify-between px-5">
        <span className="font-heading">
          <Wordmark />
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="grid h-10 w-10 place-items-center text-white transition-colors hover:text-cyan"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="m6 6 12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <nav
        aria-label="Dashboard"
        className="flex flex-1 flex-col gap-2 px-5 pt-6"
      >
        {links.map(({ to, label, icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onClose}>
            {({ isActive }) => (
              <span
                className={`flex items-center gap-3 rounded-2xl px-5 py-4 font-body text-[17px] font-semibold transition-colors ${
                  isActive
                    ? "bg-cyan/[0.08] text-cyan"
                    : "text-subtle hover:text-white"
                }`}
              >
                {icon}
                {label}
              </span>
            )}
          </NavLink>
        ))}

        {comingSoon.map(({ label, icon }) => (
          <span
            key={label}
            aria-disabled="true"
            className="flex items-center gap-3 rounded-2xl px-5 py-4 font-body text-[17px] font-semibold text-subtle/40"
          >
            {icon}
            {label}
            <span className="ml-auto rounded-full bg-violet-500/20 px-2 py-[2px] text-[9px] font-bold tracking-wide text-violet-300 uppercase">
              Soon
            </span>
          </span>
        ))}
      </nav>

      <div className="shrink-0 px-5 pb-10">
        <WalletPill />
      </div>
    </div>,
    document.body,
  );
}
