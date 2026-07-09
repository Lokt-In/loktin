import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";
import { useUsdcAllowance } from "../../hooks/useUsdcAllowance";
import {
  useLocks,
  LOCKED_VAULT_CONTRACT_ID,
} from "../../features/locked/hooks/useLocks";
import {
  STROOPS,
  durationSeconds,
  formatDate,
  formatUsdc,
  parseUsdc,
  projectedYield,
} from "../../features/locked/lib/lockMath";
import StepIndicator from "../../features/locked/components/StepIndicator";
import SuccessModal from "../../features/locked/components/SuccessModal";
import DashButton from "../../features/locked/components/DashButton";

const PERCENTS = [
  { label: "25%", frac: 25n },
  { label: "50%", frac: 50n },
  { label: "75%", frac: 75n },
  { label: "Max", frac: 100n },
];

export default function CreateLock() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const { apyTiers, lock, submitting, lastError } = useLocks();
  const {
    balance,
    formatted: balanceFormatted,
    refresh: refreshBalance,
  } = useUsdcBalance();

  const [step, setStep] = useState(1);
  const [amountInput, setAmountInput] = useState("");
  const [months, setMonths] = useState<number | null>(null);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (!address) void navigate("/");
  }, [address, navigate]);

  const amount = parseUsdc(amountInput);
  const overBalance = amount > balance;
  const amountValid = amount > 0n && !overBalance;

  const tiers = useMemo(
    () => Array.from(apyTiers.entries()).sort((a, b) => a[0] - b[0]),
    [apyTiers],
  );
  const apyBps = months !== null ? (apyTiers.get(months) ?? 0) : 0;
  const yieldStroops =
    months !== null ? projectedYield(amount, apyBps, months) : 0n;
  const unlocksOn =
    months !== null
      ? BigInt(Math.floor(Date.now() / 1000)) + durationSeconds(months)
      : 0n;

  const allowance = useUsdcAllowance({
    spenderContract: LOCKED_VAULT_CONTRACT_ID,
    requiredAmount: amount,
  });

  if (!address) return null;

  const setPercent = (frac: bigint) => {
    const raw = (balance * frac) / 100n;
    // Trim to 2dp so the field shows what the user sees elsewhere in the UI.
    const trimmed = (raw / (STROOPS / 100n)) * (STROOPS / 100n);
    setAmountInput((Number(trimmed) / Number(STROOPS)).toFixed(2));
  };

  const confirmAndLock = async () => {
    if (months === null || !amountValid) return;
    if (!allowance.sufficient) {
      const ok = await allowance.approve();
      if (!ok) return;
    }
    const id = await lock(amount, months);
    if (id !== null) {
      void refreshBalance();
      setCreated(true);
    }
  };

  const needsApproval = !allowance.loading && !allowance.sufficient;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => void navigate("/dashboard/locked")}
          aria-label="Back to Locked In"
          className="grid h-10 w-10 place-items-center rounded-full border border-[#ffffff24] text-white/70 transition-colors hover:text-white"
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
            onClick={() => void navigate("/dashboard/locked")}
            className="text-muted transition-colors hover:text-white"
          >
            Locked In
          </button>
          <span className="mx-1.5 text-muted sm:mx-2">›</span>
          <span className="text-white">Create Locked Savings</span>
        </nav>
      </div>

      <div className="mt-10">
        <StepIndicator current={step} />
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
              How much do you want to lock?
            </h1>
            <p className="mt-3 font-body text-[14.5px] leading-relaxed text-muted">
              Enter the amount of USDC you&apos;d like to commit. This
              can&apos;t be withdrawn until your chosen term ends.
            </p>

            <label
              htmlFor="amount"
              className="mt-8 block font-body text-[13px] font-semibold tracking-[0.06em] text-[#eef0f7] uppercase"
            >
              Amount to lock
            </label>
            <div className="mt-3 flex min-h-[74px] items-center rounded-xl border border-[#ffffff14] bg-surface px-5 py-4">
              <input
                id="amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^\d*\.?\d*$/.test(v)) setAmountInput(v);
                }}
                // Preflight is off, so the field keeps its UA border/background
                // and it renders as a second box inside the wrapper's chrome.
                // Reset on the element, not globally: a blanket `appearance:
                // none` would strip the native track off SpendSave's range input.
                className="w-full min-w-0 appearance-none border-0 bg-transparent font-mono text-[17px] text-white outline-none placeholder:text-muted"
              />
              <span className="ml-4 font-mono text-[15px] text-subtle">
                USDC
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PERCENTS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  disabled={balance === 0n}
                  onClick={() => setPercent(p.frac)}
                  className="rounded-lg border border-[#ffffff14] bg-[#ffffff08] py-3 font-body text-[14px] font-semibold text-subtle transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between font-body text-[14px]">
              <span className="font-semibold text-muted">Wallet balance</span>
              <span className="font-semibold text-[#eef0f7]">
                {balanceFormatted} USDC
              </span>
            </div>

            {overBalance && (
              <p className="mt-3 font-body text-[13px] text-red-400">
                That&apos;s more than your wallet holds.
              </p>
            )}

            <div className="mt-8 flex items-center justify-between">
              <DashButton
                variant="secondary"
                onClick={() => void navigate("/dashboard/locked")}
              >
                Back
              </DashButton>
              <DashButton
                variant="primary"
                disabled={!amountValid}
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
              Choose your term
            </h1>
            <p className="mt-3 font-body text-[14.5px] leading-relaxed text-muted">
              Longer terms unlock a higher APY tier. Your funds stay locked for
              the full duration.
            </p>

            <p className="mt-8 font-body text-[13px] font-semibold tracking-[0.06em] text-[#eef0f7] uppercase">
              Choose a term
            </p>

            {tiers.length === 0 ? (
              <p className="mt-4 font-body text-[14px] text-muted">
                Loading APY tiers…
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {tiers.map(([m, bps]) => {
                  const selected = months === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setMonths(m)}
                      className={`rounded-xl border p-5 text-left transition-colors ${
                        selected
                          ? "border-cyan bg-cyan/[0.08]"
                          : "border-[#ffffff14] bg-surface hover:border-[#ffffff2e]"
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span className="font-heading text-[21px] font-bold text-[#eef0f7]">
                          {m} mo
                        </span>
                        <span
                          className={`grid h-5 w-5 place-items-center rounded-full border ${
                            selected ? "border-cyan" : "border-[#ffffff3d]"
                          }`}
                        >
                          {selected && (
                            <span className="h-2.5 w-2.5 rounded-full bg-cyan" />
                          )}
                        </span>
                      </span>
                      <span className="mt-3 block font-body text-[14px] text-muted">
                        <span className="text-subtle">
                          {(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%
                        </span>{" "}
                        APY
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <DashButton variant="secondary" onClick={() => setStep(1)}>
                Back
              </DashButton>
              <DashButton
                variant="primary"
                disabled={months === null}
                onClick={() => setStep(3)}
              >
                Continue
              </DashButton>
            </div>
          </>
        )}

        {step === 3 && months !== null && (
          <>
            <h1 className="font-heading text-[25px] font-bold text-[#eef0f7]">
              Review your lock
            </h1>
            <p className="mt-3 font-body text-[14.5px] text-muted">
              Double-check the details below before confirming in your wallet.
            </p>

            <dl className="mt-8">
              <ReviewRow
                label="Principal locked"
                value={`${formatUsdc(amount)} USDC`}
              />
              <ReviewRow
                label="Term"
                value={`${months} month${months === 1 ? "" : "s"}`}
              />
              <div className="flex items-center justify-between gap-6 py-4">
                <dt className="font-body text-[14.5px] text-muted">APY Tier</dt>
                <dd className="shrink-0">
                  <span className="rounded-full border border-[#34E0A16b] bg-[#34E0A114] px-3 py-1.5 font-body text-[13.5px] font-semibold whitespace-nowrap text-[#34E0A1]">
                    {(apyBps / 100).toFixed(apyBps % 100 === 0 ? 0 : 1)}% APY
                  </span>
                </dd>
              </div>
              <ReviewRow label="Unlocks On" value={formatDate(unlocksOn)} />
              <ReviewRow
                label="Projected yield"
                value={`+${formatUsdc(yieldStroops)} USDC`}
              />
              <div className="flex items-center justify-between gap-6 py-4">
                <dt className="font-body text-[14.5px] text-muted">
                  You receive at maturity
                </dt>
                <dd className="shrink-0 text-right font-body text-[15px] font-bold text-cyan">
                  {formatUsdc(amount + yieldStroops)} USDC
                </dd>
              </div>
            </dl>

            {needsApproval && (
              <p className="mt-2 rounded-lg border border-cyan/25 bg-cyan/[0.06] px-4 py-3 font-body text-[13px] text-subtle">
                First you&apos;ll approve the Locked In contract to transfer{" "}
                {formatUsdc(amount)} USDC, then sign the lock itself — two
                wallet prompts.
              </p>
            )}

            {(lastError ?? allowance.error) && (
              <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-[13px] text-red-300">
                {lastError ?? allowance.error}
              </p>
            )}

            <div className="mt-8 flex items-center justify-between">
              <DashButton
                variant="secondary"
                disabled={submitting || allowance.approving}
                onClick={() => setStep(2)}
              >
                Back
              </DashButton>
              <DashButton
                variant="primary"
                loading={submitting || allowance.approving}
                onClick={() => void confirmAndLock()}
              >
                Confirm &amp; Lock
              </DashButton>
            </div>
          </>
        )}
      </div>

      {created && (
        <SuccessModal
          onViewLocks={() => void navigate("/dashboard/locked")}
          onDismiss={() => void navigate("/dashboard/locked")}
        />
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <dt className="font-body text-[14.5px] text-muted">{label}</dt>
      <dd className="shrink-0 text-right font-body text-[15px] font-bold text-[#eef0f7]">
        {value}
      </dd>
    </div>
  );
}
