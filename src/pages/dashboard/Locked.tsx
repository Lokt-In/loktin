import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import { useLocks, type Lock } from "../../features/locked/hooks/useLocks";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";
import { lockStatus } from "../../features/locked/lib/lockMath";
import LockRow from "../../features/locked/components/LockRow";
import UnlockModal from "../../features/locked/components/UnlockModal";
import DashButton from "../../shared/dash/DashButton";
import Spinner from "../../shared/dash/Spinner";
import FilterPills from "../../shared/dash/FilterPills";
import Pagination from "../../shared/dash/Pagination";
import SimulatedTimeBanner from "../../features/locked/components/SimulatedTimeBanner";

const FILTERS = ["All", "Active", "Matured"] as const;
type Filter = (typeof FILTERS)[number];

const PAGE_SIZE = 5;

export default function Locked() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const { locks, loading, submitting, lastError, unlock } = useLocks();
  const { refresh: refreshBalance } = useUsdcBalance();
  const [filter, setFilter] = useState<Filter>("All");
  const [page, setPage] = useState(1);
  const [unlockTarget, setUnlockTarget] = useState<Lock | null>(null);

  // Recompute maturity on a timer: a lock can cross its end_date while the page
  // is open, and nothing else would re-render the row.
  const [realNowSecs, setRealNowSecs] = useState(() =>
    Math.floor(Date.now() / 1000),
  );
  useEffect(() => {
    const id = setInterval(
      () => setRealNowSecs(Math.floor(Date.now() / 1000)),
      30_000,
    );
    return () => clearInterval(id);
  }, []);

  // Demo clock. Shifts only what's displayed — `unlock` is still gated on
  // `realNowSecs`, because the contract compares against the ledger timestamp.
  const [offsetDays, setOffsetDays] = useState(0);
  const nowSecs = realNowSecs + offsetDays * 86_400;

  useEffect(() => {
    if (!address) void navigate("/");
  }, [address, navigate]);

  const visible = useMemo(() => {
    if (filter === "All") return locks;
    const want = filter === "Active" ? "locked" : "matured";
    return locks.filter((l) => lockStatus(l, nowSecs) === want);
  }, [locks, filter, nowSecs]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));

  // The visible set can shrink under the current page — unlocking the last
  // matured lock, or a lock maturing out of the Active filter — which would
  // otherwise strand the user on an empty page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(
    () => visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visible, page],
  );

  // Locks that have not yet matured under the *simulated* clock.
  const pendingLocks = locks.filter(
    (l) => !l.is_unlocked && Number(l.end_date) > nowSecs,
  );

  /**
   * Jump the display clock just past the soonest pending maturity, so a single
   * click matures a lock. Stepping a literal day at a time would need ~30
   * clicks to mature even the shortest possible lock (the contract's minimum
   * term is one 30-day month).
   */
  const advanceToNextMaturity = () => {
    if (pendingLocks.length === 0) return;
    const soonestEnd = Math.min(...pendingLocks.map((l) => Number(l.end_date)));
    // +60s so we land strictly past end_date, never exactly on it.
    const secondsNeeded = soonestEnd - realNowSecs + 60;
    setOffsetDays(Math.ceil(secondsNeeded / 86_400));
    setPage(1);
  };

  if (!address) return null;

  // True when the open lock reads as matured only under the simulated clock.
  const unlockSimulatedOnly =
    unlockTarget !== null && realNowSecs < Number(unlockTarget.end_date);

  const confirmUnlock = async () => {
    if (!unlockTarget) return;
    // The button is disabled in this state; guard anyway so no code path can
    // submit an unlock the contract would reject with LockNotMatured.
    if (realNowSecs < Number(unlockTarget.end_date)) return;
    const payout = await unlock(unlockTarget.id);
    if (payout !== null) {
      setUnlockTarget(null);
      void refreshBalance();
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-72px)]">
      <SimulatedTimeBanner
        offsetDays={offsetDays}
        canAdvance={pendingLocks.length > 0}
        onAdvance={advanceToNextMaturity}
        onReset={() => {
          setOffsetDays(0);
          setPage(1);
        }}
      />

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
          <FilterPills
            options={FILTERS}
            value={filter}
            onChange={(f) => {
              setFilter(f);
              setPage(1);
            }}
          />
        )}

        {loading ? (
          <div
            role="status"
            aria-label="Loading locks"
            className="flex justify-center py-24 text-cyan"
          >
            <Spinner className="h-8 w-8" />
          </div>
        ) : locks.length === 0 ? (
          <EmptyState onCreate={() => void navigate("/dashboard/locked/new")} />
        ) : visible.length === 0 ? (
          <p className="py-24 text-center font-body text-[14.5px] text-muted">
            No {filter.toLowerCase()} locks.
          </p>
        ) : (
          <>
            <ul className="mt-8 flex flex-col gap-4">
              {paged.map((l) => (
                <LockRow
                  key={l.id.toString()}
                  lock={l}
                  nowSecs={nowSecs}
                  realNowSecs={realNowSecs}
                  onUnlock={setUnlockTarget}
                />
              ))}
            </ul>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={visible.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </div>

      {unlockTarget && (
        <UnlockModal
          lock={unlockTarget}
          submitting={submitting}
          error={lastError}
          simulatedOnly={unlockSimulatedOnly}
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
