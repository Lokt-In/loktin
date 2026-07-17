import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectWallet } from "../../util/wallet";
import { useWallet } from "../../hooks/useWallet";
import Wordmark from "../../shared/components/Wordmark";
import MobileMenu, { type MobileNavLink } from "./MobileMenu";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
  { label: "Docs", href: "https://docs.loktin.xyz" },
];

// The mobile overlay leads with Home and mirrors the mock's labels.
const MOBILE_LINKS: MobileNavLink[] = [
  { label: "Home", href: "#top" },
  { label: "Products", href: "#product" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "FAQs", href: "#faq" },
  { label: "Docs", href: "https://docs.loktin.xyz" },
];

/**
 * Landing-page navbar (dark redesign). Near-black frosted bar, white Fraunces
 * wordmark, muted links, and a solid cyan "Connect Wallet" CTA. Below `md` the
 * links collapse into a hamburger that opens a full-screen menu.
 */
export default function Navbar() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCTA = () => {
    if (address) void navigate("/dashboard");
    else void connectWallet();
  };

  const ctaLabel = address ? "Open App" : "Connect Wallet";

  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.08] bg-ink/70 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-[76px] max-w-(--max-width) items-center justify-between gap-4 px-5 md:gap-8 md:px-8"
      >
        <a
          href="#top"
          className="shrink-0 font-heading text-[20px] leading-none font-semibold text-white"
        >
          <Wordmark />
        </a>

        <ul className="hidden list-none items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="font-body text-[14px] font-medium text-white/60 transition-colors hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleCTA}
            className="cursor-pointer rounded-lg bg-cyan px-4 py-2.5 font-body text-[13px] font-semibold text-ink transition hover:brightness-110 sm:px-5 sm:text-[14px]"
          >
            {ctaLabel}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="grid h-10 w-10 place-items-center text-white transition-colors hover:text-cyan md:hidden"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </nav>

      <MobileMenu
        open={menuOpen}
        links={MOBILE_LINKS}
        ctaLabel={ctaLabel}
        onClose={() => setMenuOpen(false)}
        onCta={handleCTA}
      />
    </header>
  );
}
