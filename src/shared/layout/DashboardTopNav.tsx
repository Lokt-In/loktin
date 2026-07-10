import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import WalletPill from "./WalletPill";

/* The design's public/dashboard/icons/*.svg, inlined so `stroke` can follow
   `currentColor`. The source files hardcode #8E8E93 / #1A98AD, which as <img>
   would freeze the inactive (grey) and active (cyan) states. */

const HomeIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M2 7.9929V9.6665C2 11.8664 2 12.9663 2.68342 13.6498C3.36683 14.3332 4.46678 14.3332 6.66667 14.3332H9.33333C11.5332 14.3332 12.6331 14.3332 13.3166 13.6498C14 12.9663 14 11.8664 14 9.6665V7.9929C14 6.87204 14 6.31166 13.7627 5.82654C13.5255 5.34142 13.0831 4.99736 12.1984 4.30924L10.8651 3.2722C9.48873 2.20174 8.8006 1.6665 8 1.6665C7.1994 1.6665 6.51126 2.20174 5.13495 3.2722L3.80161 4.30924C2.91689 4.99736 2.47453 5.34142 2.23727 5.82654C2 6.31166 2 6.87204 2 7.9929Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 11.3335C9.46701 11.7484 8.76681 12.0002 8.00001 12.0002C7.23315 12.0002 6.53302 11.7484 6 11.3335"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M2.84651 12.5631C2.99643 13.6767 3.91872 14.549 5.04108 14.6006C5.98548 14.644 6.94484 14.6667 8.0013 14.6667C9.05777 14.6667 10.0171 14.644 10.9615 14.6006C12.0839 14.549 13.0062 13.6767 13.1561 12.5631C13.254 11.8365 13.3346 11.0917 13.3346 10.3333C13.3346 9.57493 13.254 8.8302 13.1561 8.10353C13.0062 6.99 12.0839 6.11766 10.9615 6.06606C10.0171 6.02265 9.05777 6 8.0013 6C6.94484 6 5.98548 6.02265 5.04108 6.06606C3.91872 6.11766 2.99643 6.99 2.84651 8.10353C2.74867 8.8302 2.66797 9.57493 2.66797 10.3333C2.66797 11.0917 2.74867 11.8365 2.84651 12.5631Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 6.00016V4.3335C5 2.67664 6.34315 1.3335 8 1.3335C9.65687 1.3335 11 2.67664 11 4.3335V6.00016"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.08203 10.3332H7.9987M8.16536 10.3332C8.16536 10.4252 8.09076 10.4998 7.9987 10.4998C7.90663 10.4998 7.83203 10.4252 7.83203 10.3332C7.83203 10.2411 7.90663 10.1665 7.9987 10.1665C8.09076 10.1665 8.16536 10.2411 8.16536 10.3332Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.41797 10.3332H5.33464M5.5013 10.3332C5.5013 10.4252 5.42668 10.4998 5.33464 10.4998C5.24259 10.4998 5.16797 10.4252 5.16797 10.3332C5.16797 10.2411 5.24259 10.1665 5.33464 10.1665C5.42668 10.1665 5.5013 10.2411 5.5013 10.3332Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.75 10.3332H10.6667M10.8333 10.3332C10.8333 10.4252 10.7587 10.4998 10.6667 10.4998C10.5746 10.4998 10.5 10.4252 10.5 10.3332C10.5 10.2411 10.5746 10.1665 10.6667 10.1665C10.7587 10.1665 10.8333 10.2411 10.8333 10.3332Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TargetIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M11.3346 7.99984C11.3346 9.84077 9.84224 11.3332 8.0013 11.3332C6.16036 11.3332 4.66797 9.84077 4.66797 7.99984C4.66797 6.15889 6.16036 4.6665 8.0013 4.6665"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M9.33203 1.46686C8.90123 1.3794 8.4553 1.3335 7.9987 1.3335C4.3168 1.3335 1.33203 4.31826 1.33203 8.00016C1.33203 11.682 4.3168 14.6668 7.9987 14.6668C11.6806 14.6668 14.6654 11.682 14.6654 8.00016C14.6654 7.54356 14.6194 7.09763 14.532 6.66683"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M8.01953 7.97493L11.0548 4.93966M13.1596 2.89634L12.7908 1.57158C12.7229 1.35333 12.4603 1.26636 12.2833 1.41101C11.3259 2.19338 10.2829 3.2472 11.1347 4.90939C12.8507 5.70963 13.8304 4.63049 14.5815 3.72346C14.731 3.54299 14.6409 3.27171 14.4158 3.20663L13.1596 2.89634Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LINKS: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon, end: true },
  { to: "/dashboard/locked", label: "Locked In", icon: LockIcon },
  { to: "/dashboard/targets", label: "Target Savings", icon: TargetIcon },
];

function NavItems() {
  return (
    <>
      {LINKS.map(({ to, label, icon, end }) => (
        <NavLink key={to} to={to} end={end} className="shrink-0">
          {({ isActive }) => (
            <span
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-body text-[14.5px] whitespace-nowrap transition-colors ${
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
    </>
  );
}

/**
 * Dashboard chrome: wordmark, primary nav, wallet pill. Below `md` the nav
 * drops to its own horizontally scrollable row so the wordmark and wallet pill
 * always fit on the top line.
 */
export default function DashboardTopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#ffffff44] bg-ink/90 backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 md:px-10">
        <div className="flex h-[72px] items-center gap-4 md:gap-8">
          <NavLink
            to="/"
            className="shrink-0 font-heading text-[22px] font-bold tracking-tight text-white"
          >
            LoktIn
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            <NavItems />
          </nav>

          <div className="ml-auto min-w-0">
            <WalletPill />
          </div>
        </div>

        <nav className="no-scrollbar -mx-4 flex items-center gap-1 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 md:hidden">
          <NavItems />
        </nav>
      </div>
    </header>
  );
}
