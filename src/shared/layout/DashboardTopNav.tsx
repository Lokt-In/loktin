import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import WalletPill from "./WalletPill";

const HomeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect
      x="4"
      y="10"
      width="16"
      height="11"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M8 10V7a4 4 0 1 1 8 0v3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const TargetIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="m18 6 3-3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const LINKS: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon, end: true },
  { to: "/dashboard/locked", label: "Locked In", icon: LockIcon },
  { to: "/dashboard/targets", label: "Target Savings", icon: TargetIcon },
];

/** Dashboard chrome: wordmark, primary nav, wallet pill. */
export default function DashboardTopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#ffffff14] bg-ink/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-8 px-6 md:px-10">
        <NavLink
          to="/"
          className="font-heading text-[22px] font-bold tracking-tight text-white"
        >
          LoktIn
        </NavLink>

        <nav className="flex items-center gap-1">
          {LINKS.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              {({ isActive }) => (
                <span
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-body text-[14.5px] transition-colors ${
                    isActive
                      ? "bg-cyan/10 text-cyan"
                      : "text-subtle hover:text-white"
                  }`}
                >
                  {icon}
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto">
          <WalletPill />
        </div>
      </div>
    </header>
  );
}
