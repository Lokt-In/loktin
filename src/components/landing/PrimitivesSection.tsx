import type { ReactNode } from "react";

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-5 w-5"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

const PRIMITIVES: {
  key: string;
  icon: ReactNode;
  iconClass: string;
  title: string;
  body: string;
  tags: string[];
}[] = [
  {
    key: "locked",
    icon: <LockIcon />,
    iconClass: "border-cyan/20 bg-cyan/10 text-cyan",
    title: "Locked In",
    body: "Lock a fixed amount of USDC for a fixed term. Unlock principal plus accrued yield at maturity.",
    tags: ["Fixed term", "Tiered APY"],
  },
  {
    key: "target",
    icon: <ClockIcon />,
    iconClass: "border-violet-500/20 bg-violet-500/10 text-violet-400",
    title: "Target Savings",
    body: "Set a goal, a deadline, and a cadence. LoktIn auto-deposits from your wallet each period.",
    tags: ["Goal-based", "Auto-deposits"],
  },
];

const ROADMAP = [
  {
    title: "Plans",
    body: "Lock USDC against a schedule of upcoming bill payments, so recurring expenses are already set aside before you're tempted to spend them elsewhere.",
  },
  {
    title: "Spend & Save",
    body: "Automatically routes a set percentage of every spend into a side vault. For building savings passively.",
  },
];

/**
 * "Savings primitives" section — the two live primitive cards (Locked In /
 * Target Savings) with tags, a roadmap divider, and the dashed "coming soon"
 * cards, over the background pattern.
 */
export default function PrimitivesSection() {
  return (
    <section className="relative overflow-hidden">
      <img
        src="/landing/elements/background-pattern.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40 select-none"
      />

      <div className="relative z-10 mx-auto max-w-(--max-width) px-5 py-24 md:px-8 lg:py-32">
        <div className="text-center">
          {/* <span className="inline-flex items-center rounded-full border border-[#ffffff14] bg-surface px-4 py-1.5 font-body text-[13px] font-medium text-subtle">
            Savings Options
          </span> */}
          <h2 className="mx-auto mt-6 max-w-[760px] font-heading text-[clamp(2rem,5vw,3rem)] leading-[1.15] font-bold text-white">
            Two ways to save, live today
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {PRIMITIVES.map((p) => (
            <div
              key={p.key}
              className="rounded-2xl border border-[#ffffff14] p-8 bg-[#FFFFFF0A]"
            >
              {/* <span
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${p.iconClass}`}
              >
                {p.icon}
              </span> */}
              <h3 className="mt-6 font-heading text-[18px] leading-[27.9px] font-bold text-[#eef0f7]">
                {p.title}
              </h3>
              <p className="mt-3 font-body text-[14.5px] leading-[22.48px] font-normal text-subtle">
                {p.body}
              </p>
              {/* <div className="mt-6 flex flex-wrap gap-2.5">
                <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-body text-[13px] font-semibold text-emerald-400">
                  Live on testnet
                </span>
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-lg border border-[#ffffff14] px-3 py-1.5 font-body text-[13px] font-semibold text-subtle"
                  >
                    {t}
                  </span>
                ))}
              </div> */}
            </div>
          ))}
        </div>

        <div className="my-16 flex items-center justify-center gap-6">
          <div className="h-px w-[120px] bg-[#ffffff14]" />
          <span className="font-body text-[20px] leading-[31px] font-bold text-subtle">
            Coming Soon
          </span>
          <div className="h-px w-[120px] bg-[#ffffff14]" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {ROADMAP.map((r) => (
            <div
              key={r.title}
              className="rounded-2xl border border-dashed bg-[#FFFFFF04] border-[#ffffff1f] p-8"
            >
              <div className="flex items-center gap-3">
                <h3 className="font-heading text-[15.5px] leading-[24px] font-bold text-[#eef0f7]">
                  {r.title}
                </h3>
                <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 font-body text-[11px] font-bold tracking-wider text-violet-400 uppercase">
                  Coming soon
                </span>
              </div>
              <p className="mt-3 font-body text-[13.5px] leading-[20.93px] font-normal text-muted">
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
