import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** Address + live USDC balance, with copy-to-clipboard and a disconnect menu. */
export default function WalletPill() {
  const { address, disconnect } = useWallet();
  const { formatted, loading } = useUsdcBalance();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (!address) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (insecure origin / denied permission); the
      // address is on screen either way, so fail quietly.
    }
  };

  const handleDisconnect = async () => {
    setMenuOpen(false);
    await disconnect?.();
    void navigate("/");
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-2 rounded-full border border-[#ffffff44] bg-[#ffffff0a] px-3 py-2 sm:gap-3 sm:px-5">
        <span className="font-mono text-[12px] text-white/80 sm:text-[13px]">
          {truncate(address)}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={copied ? "Address copied" : "Copy wallet address"}
          title={copied ? "Copied" : "Copy address"}
          className="grid h-6 w-6 place-items-center rounded text-white/50 transition-colors hover:text-white"
        >
          {copied ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="m5 13 4 4L19 7"
                stroke="#34E0A1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            /* public/dashboard/icons/copy-01.svg, inlined so fill/stroke follow
               currentColor — the source hardcodes white and would not pick up the
               muted-to-white hover transition as an <img>. */
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
            >
              <path
                opacity="0.4"
                d="M7.5 12.5C7.5 10.143 7.5 8.9645 8.23223 8.23223C8.9645 7.5 10.143 7.5 12.5 7.5H13.3333C15.6903 7.5 16.8688 7.5 17.6011 8.23223C18.3333 8.9645 18.3333 10.143 18.3333 12.5V13.3333C18.3333 15.6903 18.3333 16.8688 17.6011 17.6011C16.8688 18.3333 15.6903 18.3333 13.3333 18.3333H12.5C10.143 18.3333 8.9645 18.3333 8.23223 17.6011C7.5 16.8688 7.5 15.6903 7.5 13.3333V12.5Z"
                fill="currentColor"
              />
              <path
                d="M7.5 12.5C7.5 10.143 7.5 8.9645 8.23223 8.23223C8.9645 7.5 10.143 7.5 12.5 7.5H13.3333C15.6903 7.5 16.8688 7.5 17.6011 8.23223C18.3333 8.9645 18.3333 10.143 18.3333 12.5V13.3333C18.3333 15.6903 18.3333 16.8688 17.6011 17.6011C16.8688 18.3333 15.6903 18.3333 13.3333 18.3333H12.5C10.143 18.3333 8.9645 18.3333 8.23223 17.6011C7.5 16.8688 7.5 15.6903 7.5 13.3333V12.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14.1679 7.49984C14.1659 5.0356 14.1286 3.75918 13.4113 2.8852C13.2728 2.71641 13.1181 2.56165 12.9493 2.42314C12.0273 1.6665 10.6576 1.6665 7.91797 1.6665C5.1784 1.6665 3.80862 1.6665 2.88666 2.42314C2.71788 2.56165 2.56312 2.71641 2.4246 2.8852C1.66797 3.80715 1.66797 5.17694 1.66797 7.9165C1.66797 10.6561 1.66797 12.0258 2.4246 12.9478C2.56311 13.1166 2.71788 13.2713 2.88666 13.4098C3.76064 14.1272 5.03706 14.1644 7.5013 14.1664"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <span className="font-mono text-[12px] font-semibold whitespace-nowrap text-cyan sm:text-[13px]">
          {loading ? "—" : formatted} <span>USDC</span>
        </span>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Wallet menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="grid h-6 w-6 place-items-center rounded text-white/50 transition-colors hover:text-white"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className={`transition-transform ${menuOpen ? "rotate-180" : ""}`}
          >
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-[#ffffff14] bg-surface p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleDisconnect()}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 font-body text-[13.5px] text-red-300 transition-colors hover:bg-red-500/10"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M15 12H3m0 0 4-4m-4 4 4 4M11 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Disconnect wallet
          </button>
        </div>
      )}
    </div>
  );
}
