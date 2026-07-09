const UNAVAILABLE =
  "Unavailable: lock maturity follows real ledger time on testnet, which the frontend can't advance.";

/**
 * Placeholder for the design's time-travel demo affordance.
 *
 * The contract gates maturity on `env.ledger().timestamp()`, so there is no way
 * for the client to fast-forward it — the control is rendered disabled rather
 * than wired to a no-op, and the copy avoids naming a simulated day that
 * nothing is actually tracking. Wire this up if a contract-side test helper
 * ever lands.
 */
export default function SimulatedTimeBanner() {
  return (
    <div className="border-y border-dashed border-cyan/30 bg-cyan/[0.07]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between md:px-10">
        <p className="font-mono text-[13.5px] text-subtle">
          Time simulation — advance time to demo maturity and yield accrual.
        </p>
        <button
          type="button"
          disabled
          title={UNAVAILABLE}
          className="self-start font-mono text-[13.5px] font-semibold text-cyan/40 underline underline-offset-4 disabled:cursor-not-allowed sm:self-auto"
        >
          Fast-forward 1 day
        </button>
      </div>
    </div>
  );
}
