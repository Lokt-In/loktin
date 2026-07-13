import { useNavigate } from "react-router-dom";
import { connectWallet } from "../../util/wallet";
import { useWallet } from "../../hooks/useWallet";
import Wordmark from "../../shared/components/Wordmark";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
  { label: "Docs", href: "#docs" },
];

/**
 * Landing-page navbar (dark redesign). Near-black frosted bar, white Fraunces
 * wordmark, muted links, and a solid cyan "Connect Wallet" CTA. Connects the
 * wallet, or opens the app if one is already connected.
 */
export default function Navbar() {
  const { address } = useWallet();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (address) void navigate("/dashboard");
    else void connectWallet();
  };

  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.08] bg-ink/70 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-[76px] max-w-(--max-width) items-center justify-between gap-8 px-5 md:px-8"
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

        <button
          type="button"
          onClick={handleCTA}
          className="shrink-0 cursor-pointer rounded-lg bg-cyan px-5 py-2.5 font-body text-[14px] font-semibold text-ink transition hover:brightness-110"
        >
          {address ? "Open App" : "Connect Wallet"}
        </button>
      </nav>
    </header>
  );
}
