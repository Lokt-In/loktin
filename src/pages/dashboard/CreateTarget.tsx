import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";
import { useUsdcAllowance } from "../../hooks/useUsdcAllowance";
import {
  useTargets,
  TARGET_SAVINGS_CONTRACT_ID,
} from "../../features/targets/hooks/useTargets";
import {
  FREQUENCIES,
  periodAmount,
  periodCount,
  periodFits,
  scheduledTotal,
} from "../../features/targets/lib/targetMath";
import { formatDate, formatUsdc, parseUsdc } from "../../shared/lib/money";
import StepIndicator from "../../shared/dash/StepIndicator";
import DashButton from "../../shared/dash/DashButton";
import AmountField from "../../shared/dash/AmountField";
import GoalCreatedModal from "../../features/targets/components/GoalCreatedModal";

const STEPS = ["Goal", "Frequency", "Authorization", "Review"] as const;

/** Local midnight of the picked date, as unix seconds. */
function dateToUnix(value: string): bigint {
  if (!value) return 0n;
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(ms) ? 0n : BigInt(Math.floor(ms / 1000));
}

export default function CreateTarget() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const { createTarget, submitting, lastError } = useTargets();
  const { formatted: balanceFormatted, refresh: refreshBalance } =
    useUsdcBalance();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [deadline, setDeadline] = useState("");
  const [freqIndex, setFreqIndex] = useState<number | null>(null);
  const [created, setCreated] = useState(false);
  const deadlineRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!address) void navigate("/");
  }, [address, navigate]);

  const nowSecs = BigInt(Math.floor(Date.now() / 1000));
  const targetAmount = parseUsdc(amountInput);
  const endDate = dateToUnix(deadline);
  const goalSeconds = endDate > nowSecs ? endDate - nowSecs : 0n;

  const goalStepValid =
    name.trim().length > 0 && targetAmount > 0n && goalSeconds > 0n;

  const freq = freqIndex !== null ? FREQUENCIES[freqIndex] : null;
  const periods = freq ? periodCount(freq.periodSeconds, goalSeconds) : 0;
  const perDeposit = freq
    ? periodAmount(targetAmount, freq.periodSeconds, goalSeconds)
    : 0n;

  // One approval covers every scheduled debit and expires at the deadline. Size
  // it to what the keeper will really pull (period_amount * periods), not to
  // target_amount: period_amount is rounded up, and process_period logs a
  // missed period whenever the remaining allowance is short of a full period.
  const scheduled = freq
    ? scheduledTotal(targetAmount, freq.periodSeconds, goalSeconds)
    : 0n;
  const allowance = useUsdcAllowance({
    spenderContract: TARGET_SAVINGS_CONTRACT_ID,
    requiredAmount: scheduled > 0n ? scheduled : targetAmount,
    endDate: endDate > 0n ? endDate : undefined,
  });

  if (!address) return null;

  const confirmAndCreate = async () => {
    if (!freq || !goalStepValid || perDeposit <= 0n) return;
    const id = await createTarget(
      name.trim(),
      targetAmount,
      freq.periodSeconds,
      perDeposit,
      endDate,
    );
    if (id !== null) {
      void refreshBalance();
      setCreated(true);
    }
  };

  // `type=date` gives a native picker; min stops the contract's `end_date > now`
  // check from being the first thing that tells the user their date is invalid.
  const minDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => void navigate("/dashboard/targets")}
          aria-label="Back to Target Savings"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ffffff24] text-white/70 transition-colors hover:text-white"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="m14 6-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <nav
          className="min-w-0 font-mono text-[13.5px] sm:text-[15px]"
          aria-label="Breadcrumb"
        >
          <button
            type="button"
            onClick={() => void navigate("/dashboard/targets")}
            className="text-muted transition-colors hover:text-white"
          >
            Target Savings
          </button>
          <span className="mx-1.5 text-muted sm:mx-2">›</span>
          <span className="text-white">Create Target Savings</span>
        </nav>
      </div>

      <div className="mt-10">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      <div
        className="mx-auto mt-12 max-w-[680px] rounded-2xl border border-[#ffffff14] p-6 sm:p-9 md:mt-20"
        style={{
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)",
        }}
      >
        {step === 1 && (
          <>
            <h1 className="font-heading text-[25px] font-bold text-[#eef0f7]">
              What are you saving for?
            </h1>
            <p className="mt-3 font-body text-[14.5px] leading-relaxed text-muted">
              Give your goal a name, set a target amount, and pick a deadline.
            </p>

            <label
              htmlFor="goal-name"
              className="mt-8 block font-body text-[13px] font-semibold tracking-[0.06em] text-[#eef0f7] uppercase"
            >
              Goal name
            </label>
            <div className="mt-3 flex min-h-[74px] items-center rounded-xl border border-[#ffffff14] bg-surface px-5 py-4">
              <input
                id="goal-name"
                value={name}
                maxLength={64}
                placeholder="e.g new laptop"
                onChange={(e) => setName(e.target.value)}
                className="w-full min-w-0 appearance-none border-0 bg-transparent font-mono text-[17px] text-white outline-none placeholder:text-muted"
              />
            </div>

            <div className="mt-8">
              <AmountField
                id="goal-amount"
                label="Goal amount"
                value={amountInput}
                onChange={setAmountInput}
                balanceFormatted={balanceFormatted}
              />
            </div>

            <label
              htmlFor="deadline"
              className="mt-8 block font-body text-[13px] font-semibold tracking-[0.06em] text-[#eef0f7] uppercase"
            >
              Deadline
            </label>
            <div className="mt-3 flex min-h-[74px] items-center gap-4 rounded-xl border border-[#ffffff14] bg-surface px-5 py-4">
              <input
                ref={deadlineRef}
                id="deadline"
                type="date"
                min={minDate}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                // Hide only the UA's picker indicator (the calendar icon opens
                // it). NOT `appearance-none` — that suppresses tap-to-open on
                // iOS Safari, which left mobile users unable to pick a date.
                className="w-full min-w-0 border-0 bg-transparent font-mono text-[17px] text-white outline-none [&::-webkit-calendar-picker-indicator]:hidden"
              />
              {/* A <label>, not a button: tapping it forwards to the input,
                  which opens the OS date picker natively on mobile — where
                  showPicker() is missing or throws. showPicker (guarded) gives
                  the nicer popup on desktop. */}
              <label
                htmlFor="deadline"
                aria-label="Open date picker"
                onClick={() => {
                  try {
                    deadlineRef.current?.showPicker?.();
                  } catch {
                    // Mobile opens via the label's native focus; ignore.
                  }
                }}
                className="shrink-0 cursor-pointer text-muted transition-colors hover:text-white"
              >
                {/* public/dashboard/icons/calendar-02.svg, inlined so stroke
                    follows currentColor (the source hardcodes #8E8E93). */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M16 2V6M8 2V6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 10H21"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11 14H16M8 14H8.00898M13 18H8M16 18H15.991"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </label>
            </div>
            {deadline !== "" && goalSeconds <= 0n && (
              <p className="mt-3 font-body text-[13px] text-red-400">
                Pick a date in the future.
              </p>
            )}

            <div className="mt-8 flex items-center justify-between">
              <DashButton
                variant="secondary"
                onClick={() => void navigate("/dashboard/targets")}
              >
                Back
              </DashButton>
              <DashButton
                variant="primary"
                disabled={!goalStepValid}
                onClick={() => setStep(2)}
              >
                Continue
              </DashButton>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-heading text-[25px] font-bold text-[#eef0f7]">
              How often should we deposit?
            </h1>
            <p className="mt-3 font-body text-[14.5px] leading-relaxed text-muted">
              We&apos;ll auto-pull this amount from your wallet each period via
              the keeper.
            </p>

            <p className="mt-8 font-body text-[13px] font-semibold tracking-[0.06em] text-[#eef0f7] uppercase">
              Frequency
            </p>

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {FREQUENCIES.map((f, i) => {
                const selected = freqIndex === i;
                // create_target rejects period_seconds > end_date - now, so a
                // weekly schedule needs at least a week before the deadline.
                const fits = periodFits(f.periodSeconds, goalSeconds);
                return (
                  <button
                    key={f.label}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!fits}
                    title={
                      fits
                        ? undefined
                        : `Your deadline is sooner than one ${f.per}.`
                    }
                    onClick={() => setFreqIndex(i)}
                    className={`rounded-xl border p-5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected
                        ? "border-cyan bg-cyan/[0.08]"
                        : "border-[#ffffff14] bg-surface hover:border-[#ffffff2e]"
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-heading text-[21px] font-bold text-[#eef0f7]">
                        {f.label}
                      </span>
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                          selected ? "border-cyan" : "border-[#ffffff3d]"
                        }`}
                      >
                        {selected && (
                          <span className="h-2.5 w-2.5 rounded-full bg-cyan" />
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {freq && periods > 0 && (
              <dl className="mt-6 rounded-xl border border-[#ffffff14] bg-[#ffffff08] px-6 py-2">
                <div className="flex items-center justify-between gap-6 py-4">
                  <dt className="font-body text-[14.5px] text-muted">
                    Periods until deadline
                  </dt>
                  <dd className="shrink-0 font-body text-[15px] font-bold text-[#eef0f7]">
                    {periods} deposit{periods === 1 ? "" : "s"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-6 py-4">
                  <dt className="font-body text-[14.5px] text-muted">
                    Amount per deposit
                  </dt>
                  <dd className="shrink-0 font-body text-[15px] font-bold text-cyan">
                    {formatUsdc(perDeposit)} USDC / {freq.per}
                  </dd>
                </div>
              </dl>
            )}

            <div className="mt-8 flex items-center justify-between">
              <DashButton variant="secondary" onClick={() => setStep(1)}>
                Back
              </DashButton>
              <DashButton
                variant="primary"
                disabled={!freq || periods <= 0 || perDeposit <= 0n}
                onClick={() => setStep(3)}
              >
                Continue
              </DashButton>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-heading text-[25px] font-bold text-[#eef0f7]">
              Authorize periodic deposits
            </h1>
            <p className="mt-3 font-body text-[14.5px] leading-relaxed text-muted">
              To run auto-deposits, grant LoktIn&apos;s Target Savings contract
              a USDC allowance for this goal. You can revoke it anytime.
            </p>

            <div className="mt-8 rounded-xl border border-[#ffffff14] bg-surface p-5">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="font-heading text-[17px] font-bold text-[#eef0f7]">
                    USDC spend allowance
                  </p>
                  <p className="mt-2 font-body text-[14px] leading-relaxed text-muted">
                    Lets the keeper pull each scheduled deposit via
                    transfer_from. Capped to your goal total.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={allowance.sufficient}
                  aria-label="Grant USDC spend allowance"
                  disabled={allowance.loading || allowance.approving}
                  onClick={() => {
                    if (!allowance.sufficient) void allowance.approve();
                  }}
                  className={`relative mt-1 h-7 w-13 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    allowance.sufficient ? "bg-cyan" : "bg-[#3a3b45]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-[left] ${
                      allowance.sufficient ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {allowance.approving && (
                <p className="mt-4 font-body text-[13px] text-subtle">
                  Waiting for the approval to confirm…
                </p>
              )}
            </div>

            {allowance.error && (
              <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-[13px] text-red-300">
                {allowance.error}
              </p>
            )}

            <div className="mt-8 flex items-center justify-between">
              <DashButton
                variant="secondary"
                disabled={allowance.approving}
                onClick={() => setStep(2)}
              >
                Back
              </DashButton>
              <DashButton
                variant="primary"
                loading={allowance.approving}
                disabled={!allowance.sufficient}
                title={
                  allowance.sufficient
                    ? undefined
                    : "Grant the allowance to continue."
                }
                onClick={() => setStep(4)}
              >
                Continue
              </DashButton>
            </div>
          </>
        )}

        {step === 4 && freq && (
          <>
            <h1 className="font-heading text-[25px] font-bold text-[#eef0f7]">
              Review your goal
            </h1>
            <p className="mt-3 font-body text-[14.5px] text-muted">
              Confirm the details below to create your goal on testnet.
            </p>

            <dl className="mt-8">
              <ReviewRow label="Goal" value={name.trim()} />
              <ReviewRow
                label="Goal Amount"
                value={`${formatUsdc(targetAmount)} USDC`}
              />
              <ReviewRow label="Deadline" value={formatDate(endDate)} />
              <ReviewRow label="Frequency" value={freq.label} />
              <div className="flex items-center justify-between gap-6 py-4">
                <dt className="font-body text-[14.5px] text-muted">
                  Per deposit amount
                </dt>
                <dd className="shrink-0 text-right font-body text-[15px] font-bold text-cyan">
                  {formatUsdc(perDeposit)} USDC
                </dd>
              </div>
            </dl>

            {lastError && (
              <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-[13px] text-red-300">
                {lastError}
              </p>
            )}

            <div className="mt-8 flex items-center justify-between">
              <DashButton
                variant="secondary"
                disabled={submitting}
                onClick={() => setStep(3)}
              >
                Back
              </DashButton>
              <DashButton
                variant="primary"
                loading={submitting}
                onClick={() => void confirmAndCreate()}
              >
                Confirm &amp; Lock
              </DashButton>
            </div>
          </>
        )}
      </div>

      {created && (
        <GoalCreatedModal
          onView={() => void navigate("/dashboard/targets")}
          onDismiss={() => void navigate("/dashboard/targets")}
        />
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <dt className="font-body text-[14.5px] text-muted">{label}</dt>
      <dd className="shrink-0 text-right font-body text-[15px] font-bold break-words text-[#eef0f7]">
        {value}
      </dd>
    </div>
  );
}
