interface Props {
  /** Days the displayed clock is shifted forward by. */
  offsetDays: number;
  /** False when everything has already matured (or there's nothing) — nothing left to skip to. */
  canAdvance: boolean;
  onAdvance: () => void;
  onReset: () => void;
}

/**
 * Demo affordance that shifts the *displayed* clock forward. Shared by Locked In
 * and Target Savings.
 *
 * It cannot move real time — both contracts compare `env.ledger().timestamp()`
 * against `end_date`. Callers must keep every money decision on the real clock:
 *
 *  - `locked_in::unlock` reverts with `LockNotMatured` before maturity.
 *  - `target_savings::withdraw` does NOT revert early; it silently charges the
 *    1% forfeit. Reading maturity off the simulated clock there would hide a
 *    real deduction, so the payout math and the confirm button stay on real time.
 *
 * This previews maturity. It never enables, or discounts, an early exit.
 */
export default function SimulatedTimeBanner({
  offsetDays,
  canAdvance,
  onAdvance,
  onReset,
}: Props) {
  return (
    <div className="border-y border-dashed border-cyan/30 bg-cyan/[0.07]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:px-10">
        <p className="font-mono text-[13.5px] text-subtle">
          {offsetDays === 0
            ? "Time simulation — advance time to demo maturity and yield accrual."
            : `Simulated day ${offsetDays} — preview only; unlocking still follows real ledger time.`}
        </p>

        <div className="flex shrink-0 items-center gap-4">
          {offsetDays > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="font-mono text-[13.5px] text-muted underline underline-offset-4 transition-colors hover:text-white"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={onAdvance}
            disabled={!canAdvance}
            title={
              canAdvance
                ? "Jump the displayed clock past the soonest lock's maturity."
                : "Nothing left to skip to — every lock has already matured."
            }
            className="font-mono text-[13.5px] font-semibold text-cyan underline underline-offset-4 transition-colors hover:brightness-125 disabled:cursor-not-allowed disabled:text-cyan/40"
          >
            Fast-forward to maturity
          </button>
        </div>
      </div>
    </div>
  );
}
