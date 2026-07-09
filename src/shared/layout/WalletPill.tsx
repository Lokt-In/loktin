import { useState } from "react";
import { useWallet } from "../../hooks/useWallet";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** Address + live USDC balance, with a copy-to-clipboard affordance. */
export default function WalletPill() {
  const { address } = useWallet();
  const { formatted, loading } = useUsdcBalance();
  const [copied, setCopied] = useState(false);

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

  return (
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
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <rect
              x="9"
              y="9"
              width="11"
              height="11"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M5 15V5a2 2 0 0 1 2-2h10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
      <span className="font-mono text-[12px] font-semibold whitespace-nowrap text-cyan sm:text-[13px]">
        {loading ? "—" : formatted} <span>USDC</span>
      </span>
    </div>
  );
}
