const PROBLEMS = [
  {
    n: "01",
    title: "Custodial by default",
    body: "Most crypto savings products that enforce discipline for you also take custody of your funds — the opposite of what brought people to crypto in the first place.",
  },
  {
    n: "02",
    title: "Yield requires expertise",
    body: "Staking, lending, and arbitrage all work, but each comes with its own learning curve and its own way to lose money if you get it wrong.",
  },
  {
    n: "03",
    title: "Nothing stops you",
    body: "Idle funds in a regular wallet are one tap away from being spent. There's no contract holding you to the plan you made for yourself.",
  },
];

/**
 * "The problem" section — eyebrow pill, headline + copy, and three numbered
 * problem cards.
 */
export default function ProblemSection() {
  return (
    <section className="mx-auto max-w-(--max-width) px-5 py-20 md:px-8 lg:py-28">
      <span className="inline-flex items-center gap-2 rounded-full border border-orange px-4 py-1.5 font-plex-mono text-[0.72rem] font-medium tracking-[0.18em] text-orange uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-orange" />
        The problem
      </span>

      <h2 className="mt-6 max-w-[760px] font-heading text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.1] font-semibold tracking-[-0.01em] text-navy">
        Saving discipline is easy to find in Web2. In crypto, it&apos;s rare.
      </h2>
      <p className="mt-5 max-w-[560px] font-body text-[1.0625rem] leading-relaxed text-navy/70">
        Most people already know what they should do with idle money — lock it
        away, save toward something, put it to work. Crypto makes that harder,
        not easier.
      </p>

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
        {PROBLEMS.map((p) => (
          <div
            key={p.n}
            className="rounded-[10px] border border-tan bg-[#f6f1e5] p-7"
          >
            <p className="font-plex-mono text-[0.8rem] font-medium text-gold">
              {p.n}
            </p>
            <h3 className="mt-4 font-heading text-[1.3rem] font-semibold text-navy">
              {p.title}
            </h3>
            <p className="mt-3 font-body text-[0.95rem] leading-relaxed text-navy/70">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
