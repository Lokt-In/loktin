import { useState } from "react";

const FAQS = [
  {
    q: "Is LoktIn custodial?",
    a: "No — LoktIn is fully non-custodial. Your USDC never leaves your wallet's control; smart contracts enforce the rules, and you always hold your own keys.",
  },
  {
    q: "Where does the yield come from?",
    a: "Idle USDC is routed to Blend, a lending protocol on Stellar, which generates yield while your funds are committed. It happens automatically — no manual staking.",
  },
  {
    q: "What does LoktIn charge?",
    a: "A 10% fee on the yield you earn — never on your principal. If a position earns nothing, you pay nothing.",
  },
  {
    q: "Do I need to complete KYC?",
    a: "No. There's no KYC and no sign-up forms — just connect your Stellar wallet and go. Your wallet is your identity.",
  },
  {
    q: "Can I withdraw before maturity?",
    a: "It depends on the primitive. Locked In has no early exit — it unlocks at maturity. Target Savings lets you withdraw early for a modest 1% forfeit.",
  },
  {
    q: "What network is this on right now?",
    a: "LoktIn is live on the Stellar testnet with Circle-issued test USDC. Mainnet is on the roadmap.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[14px] border border-[#ffffff14] bg-[#ffffff0a]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-16 w-full cursor-pointer items-center justify-between gap-4 px-6 text-left"
      >
        <span className="font-body text-[15.5px] leading-none font-bold text-[#eef0f7]">
          {q}
        </span>
        <span
          className={`shrink-0 text-2xl leading-none text-cyan transition-transform duration-200 ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="max-w-[720px] font-body text-[14.5px] leading-relaxed text-subtle">
            {a}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * FAQ section — centered eyebrow + headline and an accordion of common
 * questions (cyan +/× toggle).
 */
export default function FaqSection() {
  return (
    <section
      id="faq"
      className="mx-auto max-w-(--max-width) px-5 py-24 md:px-8 lg:py-32"
    >
      <div className="text-center">
        {/* <span className="inline-flex items-center rounded-full border border-[#ffffff14] bg-surface px-4 py-1.5 font-body text-[13px] font-medium text-subtle">
          FAQ
        </span> */}
        <h2 className="mt-6 font-heading text-[clamp(2rem,5vw,3.25rem)] leading-[1.15] font-bold text-white">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="mx-auto mt-14 max-w-[760px] space-y-4">
        {FAQS.map((f) => (
          <FaqItem key={f.q} q={f.q} a={f.a} />
        ))}
      </div>
    </section>
  );
}
