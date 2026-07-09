import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import { useLocks, type Lock } from "../../features/locked/hooks/useLocks";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";
import { lockStatus } from "../../features/locked/lib/lockMath";
import LockRow from "../../features/locked/components/LockRow";
import UnlockModal from "../../features/locked/components/UnlockModal";
import DashButton from "../../features/locked/components/DashButton";
import SimulatedTimeBanner from "../../features/locked/components/SimulatedTimeBanner";

const FILTERS = ["All", "Active", "Matured"] as const;
type Filter = (typeof FILTERS)[number];

export default function Locked() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const { locks, loading, submitting, lastError, unlock } = useLocks();
  const { refresh: refreshBalance } = useUsdcBalance();
  const [filter, setFilter] = useState<Filter>("All");
  const [unlockTarget, setUnlockTarget] = useState<Lock | null>(null);

  // Recompute maturity on a timer: a lock can cross its end_date while the page
  // is open, and nothing else would re-render the row.
  const [nowSecs, setNowSecs] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(
      () => setNowSecs(Math.floor(Date.now() / 1000)),
      30_000,
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!address) void navigate("/");
  }, [address, navigate]);

  const visible = useMemo(() => {
    if (filter === "All") return locks;
    const want = filter === "Active" ? "locked" : "matured";
    return locks.filter((l) => lockStatus(l, nowSecs) === want);
  }, [locks, filter, nowSecs]);

  if (!address) return null;

  const confirmUnlock = async () => {
    if (!unlockTarget) return;
    const payout = await unlock(unlockTarget.id);
    if (payout !== null) {
      setUnlockTarget(null);
      void refreshBalance();
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-72px)]">
      <SimulatedTimeBanner />

      {/* Faint grid wash behind the content, per the design. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <img
          src="/dashboard/element/girdline.png"
          alt=""
          className="absolute top-0 left-1/2 w-[1283px] max-w-none -translate-x-1/2 opacity-30 select-none"
        />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-4 py-10 sm:px-6 md:px-10 md:py-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[640px]">
            <h1 className="font-heading text-[28px] leading-tight font-bold text-[#eef0f7] sm:text-[34px]">
              Locked In
            </h1>
            <p className="mt-3 font-body text-[14.5px] leading-relaxed text-muted">
              Lock USDC for a fixed term. The contract won&apos;t release it
              before maturity — not to anyone, including LoktIn. Yield accrues
              from Blend the whole time it&apos;s locked.
            </p>
          </div>
          <DashButton
            variant="primary"
            onClick={() => void navigate("/dashboard/locked/new")}
            className="w-full shrink-0 px-6 py-3 sm:w-auto"
          >
            Create Locked Savings
          </DashButton>
        </div>

        {lastError && !unlockTarget && (
          <p className="mt-8 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-[13px] text-red-300">
            {lastError}
          </p>
        )}

        {locks.length > 0 && (
          <div className="-mx-4 mt-10 flex items-center gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`shrink-0 rounded-full border px-6 py-2.5 font-body text-[14px] transition-colors ${
                  filter === f
                    ? "border-cyan/40 bg-cyan/10 text-cyan"
                    : "border-[#ffffff14] bg-transparent text-muted hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="py-24 text-center font-body text-[14.5px] text-muted">
            Loading locks…
          </p>
        ) : locks.length === 0 ? (
          <EmptyState onCreate={() => void navigate("/dashboard/locked/new")} />
        ) : visible.length === 0 ? (
          <p className="py-24 text-center font-body text-[14.5px] text-muted">
            No {filter.toLowerCase()} locks.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {visible.map((l) => (
              <LockRow
                key={l.id.toString()}
                lock={l}
                nowSecs={nowSecs}
                onUnlock={setUnlockTarget}
              />
            ))}
          </ul>
        )}
      </div>

      {unlockTarget && (
        <UnlockModal
          lock={unlockTarget}
          submitting={submitting}
          error={lastError}
          onConfirm={() => void confirmUnlock()}
          onCancel={() => setUnlockTarget(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center py-32 text-center">
      <img
        src="/dashboard/element/empty-state.svg"
        alt=""
        aria-hidden
        width={150}
        height={150}
        className="select-none"
      />

      <h2 className="mt-6 font-heading text-[27px] font-bold text-[#eef0f7]">
        You currently have zero locked funds
      </h2>
      <p className="mt-3 font-body text-[14.5px] text-muted">
        Click on “Create Locked Savings” to create your first locked savings
      </p>
      <DashButton
        variant="primary"
        onClick={onCreate}
        className="mt-8 px-6 py-3"
      >
        Create Locked Savings
      </DashButton>
    </div>
  );
}
