import { useEffect, useState } from "react";
import Wordmark from "../../shared/components/Wordmark";

export interface MobileNavLink {
  label: string;
  href: string;
}

interface Props {
  open: boolean;
  links: MobileNavLink[];
  ctaLabel: string;
  onClose: () => void;
  onCta: () => void;
}

/**
 * Full-screen landing nav for mobile: logo + close at the top, centered links,
 * and the wallet CTA pinned at the bottom. The active link is highlighted from
 * the current URL hash (updated as the user taps a section or scrolls to one).
 */
export default function MobileMenu({
  open,
  links,
  ctaLabel,
  onClose,
  onCta,
}: Props) {
  const [hash, setHash] = useState(() =>
    typeof window === "undefined" ? "" : window.location.hash,
  );

  useEffect(() => {
    if (!open) return;
    const onHash = () => setHash(window.location.hash);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("hashchange", onHash);
    document.addEventListener("keydown", onKey);
    // Freeze the page behind the overlay while it owns the viewport.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  // "Home" (#top or no hash) is active at the top of the page.
  const isActive = (href: string) =>
    href === "#top" ? hash === "" || hash === "#top" : hash === href;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-[200] flex flex-col bg-ink md:hidden"
    >
      <div className="flex h-[76px] shrink-0 items-center justify-between px-5">
        <a href="#top" onClick={onClose}>
          <Wordmark />
        </a>
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

      <nav aria-label="Mobile" className="flex flex-1 flex-col gap-2 px-5 pt-8">
        {links.map((l) => {
          const active = isActive(l.href);
          const external = l.href.startsWith("http");
          return (
            <a
              key={l.href}
              href={l.href}
              onClick={onClose}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className={`rounded-2xl py-5 text-center font-body text-[19px] font-semibold transition-colors ${
                active
                  ? "bg-cyan/[0.08] text-cyan"
                  : "text-white/55 hover:text-white"
              }`}
            >
              {l.label}
            </a>
          );
        })}
      </nav>

      <div className="shrink-0 px-5 pb-10">
        <button
          type="button"
          onClick={() => {
            onClose();
            onCta();
          }}
          className="w-full cursor-pointer rounded-2xl bg-cyan py-4 font-body text-[16px] font-semibold text-ink transition hover:brightness-110"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
