import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { connectWallet } from "../../util/wallet";
import { useWallet } from "../../hooks/useWallet";

const CARD_BG: CSSProperties = {
  background:
    "linear-gradient(109.88deg, rgba(139,92,246,0.14) 0%, rgba(34,211,238,0.1) 100%)",
};

/**
 * Closing CTA — a violet→cyan gradient card with the headline, copy, and the
 * cyan Connect Wallet button.
 */
export default function CtaSection() {
  const { address } = useWallet();
  const navigate = useNavigate();

  const handleConnect = () => {
    if (address) void navigate("/dashboard");
    else void connectWallet();
  };

  return (
    <section className="mx-auto max-w-(--max-width) px-5 md:px-8">
      <div
        style={CARD_BG}
        className="mx-auto max-w-[1104px] rounded-[26px] border border-[#8B5CF64D] px-10 py-[70px] text-center"
      >
        <h2 className="font-heading text-[38px] leading-[58.9px] font-bold tracking-[-0.76px] text-[#eef0f7]">
          Ready to Lock in?
        </h2>
        <p className="mx-auto mt-[13px] max-w-[440px] font-body text-[16px] leading-[24.8px] font-normal text-subtle">
          Connect your Stellar wallet and set up your first savings plan in
          under two minutes.
        </p>
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleConnect}
            className="inline-flex h-[47px] w-[158px] cursor-pointer items-center justify-center rounded-xl border border-black bg-cyan font-body text-[14.5px] leading-none font-bold text-[#05060a] transition hover:brightness-105"
          >
            {address ? "Open App" : "Connect Wallet"}
          </button>
        </div>
      </div>
    </section>
  );
}
