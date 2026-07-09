import type { CSSProperties } from "react";

const CARD_BG: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
};

/**
 * Hero mockup (dark): a "Locked In" position card — muted header with an APY
 * pill, principal / projected-yield rows, and a target progress bar in cyan.
 * Static illustration.
 */
export default function LockedInCard() {
  return (
    <div style={CARD_BG} className="rounded-2xl border border-[#ffffff14] p-7">
      <div className="flex items-center justify-between">
        <p className="font-body text-[13px] leading-[20.15px] font-normal text-muted">
          Locked In · 6 months
        </p>
        <span className="rounded-full border border-[#34E0A14D] bg-[#34E0A124] px-3 py-1 font-body text-[12px] leading-[18.6px] font-bold text-[#34E0A1]">
          8.4% APY
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between pb-4">
        <span className="font-body text-[13px] leading-[20.15px] font-normal text-muted">
          Principal locked
        </span>
        <span className="font-body text-[14.5px] leading-[22.48px] font-bold text-[#eef0f7]">
          1,000.00 USDC
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-body text-[13px] leading-[20.15px] font-normal text-muted">
          Projected yield
        </span>
        <span className="font-body text-[14.5px] leading-[22.48px] font-bold text-cyan">
          +42.10 USDC
        </span>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <span className="font-body text-[13px] leading-[20.15px] font-normal text-muted">
            Target: 1,000 USDC by Dec
          </span>
          <span className="font-body text-[14.5px] leading-[22.48px] font-bold text-muted">
            62%
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan"
            style={{ width: "62%" }}
          />
        </div>
      </div>
    </div>
  );
}
