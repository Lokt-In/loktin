const CHECKS = [
  "Non-custodial — you always hold your own keys",
  "No KYC, no sign-up forms — just connect and go",
  "Yield flows in automatically via Blend — no manual staking",
  "Smart contracts enforce your commitment — not your willpower",
];

const STEPS = [
  {
    n: "1",
    title: "Connect your Stellar wallet",
    body: "No account creation. Your wallet is your identity.",
  },
  {
    n: "2",
    title: "Pick a savings primitive",
    body: "Lock a fixed amount, or set a target goal with auto-deposits.",
  },
  {
    n: "3",
    title: "Your USDC earns yield via Blend",
    body: "Idle funds are routed automatically — no action needed.",
  },
  {
    n: "4",
    title: "Withdraw on your terms",
    body: "At maturity, or early with a small, transparent fee.",
  },
];

function Check() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mt-0.5 h-[18px] w-[18px] shrink-0 text-emerald-400"
    >
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

/**
 * "The product" section — centered eyebrow + headline, then a two-column split:
 * the pitch + benefits checklist on the left, the numbered how-it-works flow in
 * a card on the right.
 */
export default function ProductSection() {
  return (
    <section className="mx-auto max-w-(--max-width) px-5 py-24 md:px-8 lg:py-32">
      <div className="text-center">
        <span className="inline-flex items-center rounded-full border border-[#ffffff14] bg-surface px-4 py-1.5 font-body text-[13px] font-medium text-subtle">
          The Product
        </span>
        <h2 className="mx-auto mt-6 max-w-[860px] font-heading text-[clamp(2rem,5vw,3.25rem)] leading-[1.2] font-bold text-white">
          Crypto savings that feels like the app you already use
        </h2>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
        <div>
          <h3 className="font-heading text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2] font-bold text-white">
            Built for people who <span className="text-cyan">hold crypto</span>,
            not DeFi power users
          </h3>
          <p className="mt-5 max-w-[520px] font-body text-[1rem] leading-relaxed text-subtle">
            If you already know your way around a wallet — but staking, lending
            pools, and impermanent loss aren&apos;t your thing — LoktIn is built
            for you. We hide the DeFi complexity behind a familiar, Web2-style
            savings experience.
          </p>
          <ul className="mt-8 space-y-4">
            {CHECKS.map((c) => (
              <li
                key={c}
                className="flex items-start gap-3 font-body text-[0.95rem] leading-relaxed text-subtle"
              >
                <Check />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[#ffffff14] bg-surface p-6 md:p-8">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className={`flex gap-4 py-5 ${
                i > 0 ? "border-t border-[#ffffff14]" : ""
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#ffffff14] bg-white/[0.03] font-body text-[13px] font-semibold text-cyan">
                {step.n}
              </span>
              <div>
                <h4 className="font-heading text-[1.0625rem] leading-snug font-semibold text-white">
                  {step.title}
                </h4>
                <p className="mt-1 font-body text-[0.9rem] leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
