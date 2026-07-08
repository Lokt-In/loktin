import { useNavigate } from "react-router-dom";
import { connectWallet } from "../../util/wallet";
import { useWallet } from "../../hooks/useWallet";
import LandingButton from "./LandingButton";
import LockedInCard from "./LockedInCard";

const STATS = [
  { value: "100%", label: "Non-custodial, always" },
  { value: "0", label: "KYC required" },
  { value: "10%", label: "Fee — on yield only" },
];

/**
 * Landing hero (dark, centered): status pill, headline, copy, CTAs, a stats
 * card, and the Locked-In position mockup.
 */
export default function HeroSection() {
  const { address } = useWallet();
  const navigate = useNavigate();

  const handleConnect = () => {
    if (address) void navigate("/dashboard");
    else void connectWallet();
  };

  return (
    <section className="relative overflow-hidden">
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
        <filter id="grid-ripple" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.011 0.013"
            numOctaves="2"
            seed="4"
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              dur="16s"
              values="0.011 0.013;0.015 0.017;0.011 0.013"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="16"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <img
        src="/landing/elements/gridlines.png"
        alt=""
        aria-hidden
        className="grid-ripple-fx pointer-events-none absolute top-0 left-1/2 w-[1283px] max-w-none -translate-x-1/2 opacity-50 select-none"
      />
      <div className="relative z-10 mx-auto max-w-(--max-width) px-5 py-24 md:px-8 lg:py-32">
        <div className="mx-auto max-w-[820px] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ffffff14] bg-[#ffffff0a] px-4 py-1.5 font-body text-[12.5px] leading-[19.38px] font-bold tracking-[0.5px] text-subtle">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live on Stellar Testnet
          </span>

          <h1 className="mt-8 font-heading text-[clamp(2.75rem,7vw,5rem)] leading-[1.05] font-bold text-white">
            Save on-chain like you{" "}
            <span className="text-cyan">actually mean it.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-[620px] font-body text-[1.125rem] leading-relaxed text-subtle">
            LoktIn uses Stellar smart contracts to lock in your savings
            commitments — so willpower isn&apos;t the thing standing between you
            and your goals. Your USDC earns yield via Blend the whole time, with
            zero DeFi know-how required.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <LandingButton variant="primary" onClick={handleConnect}>
              {address ? "Open App" : "Connect Wallet"}
            </LandingButton>
            <LandingButton variant="secondary" href="#how-it-works">
              See how it works
            </LandingButton>
          </div>
        </div>

        <dl className="mx-auto h-[192.57000732421875px] mt-16 grid max-w-[900px] grid-cols-3 divide-x divide-[#ffffff14]/30 rounded-2xl border border-[#ffffff14] bg-surface">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="px-6 py-10 text-center flex flex-col items-center justify-between"
            >
              <dt className="font-heading text-[24px] leading-[37.2px] font-bold text-[#eef0f7]">
                {s.value}
              </dt>
              <dd className="font-body text-[12.5px] leading-[19.38px] font-medium text-muted">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mx-auto mt-[64px] max-w-[780px]">
          <LockedInCard />
        </div>
      </div>
    </section>
  );
}
