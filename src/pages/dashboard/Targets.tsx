import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";
import {
  useTargets,
  type TargetGoal,
} from "../../features/targets/hooks/useTargets";
import {
  targetStatus,
  type TargetStatus,
} from "../../features/targets/lib/targetMath";
import TargetRow from "../../features/targets/components/TargetRow";
import TopUpModal from "../../features/targets/components/TopUpModal";
import WithdrawModal from "../../features/targets/components/WithdrawModal";
import DashButton from "../../shared/dash/DashButton";
import Spinner from "../../shared/dash/Spinner";
import FilterPills from "../../shared/dash/FilterPills";
import Pagination from "../../shared/dash/Pagination";

const FILTERS = ["All", "On track", "Missed", "Withdrawn"] as const;
type Filter = (typeof FILTERS)[number];

/** Filter label -> the TargetStatus it selects. "All" filters nothing. */
const FILTER_STATUS: Record<Exclude<Filter, "All">, TargetStatus> = {
  "On track": "on-track",
  Missed: "missed",
  Withdrawn: "withdrawn",
};

const PAGE_SIZE = 5;

export default function Targets() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const {
    goals,
    loading,
    submitting,
    lastError,
    getGoalYield,
    manualDeposit,
    withdraw,
  } = useTargets();
  const {
    balance,
    formatted: balanceFormatted,
    refresh: refreshBalance,
  } = useUsdcBalance();

  const [filter, setFilter] = useState<Filter>("All");
  const [page, setPage] = useState(1);
  const [topUpTarget, setTopUpTarget] = useState<TargetGoal | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<TargetGoal | null>(null);
  const [goalYield, setGoalYield] = useState<bigint | null>(null);

  // A goal can cross its deadline while the page is open; nothing else would
  // re-render the row.
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

  const nowSecs = realNowSecs;

  useEffect(() => {
    if (!address) void navigate("/");
  }, [address, navigate]);

  const visible = useMemo(() => {
    if (filter === "All") return goals;
    const want = FILTER_STATUS[filter];
    return goals.filter((g) => targetStatus(g, nowSecs) === want);
  }, [goals, filter, nowSecs]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));

  // The visible set can shrink under the current page (a withdrawal, or a goal
  // maturing out of the On-track filter), stranding the user on an empty page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(
    () => visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visible, page],
  );

  // `goal.accrued_yield` lags — it's only settled up to `last_yield_update`. Pull
  // the live figure when the modal opens, since that's what `withdraw` pays.
  const openWithdraw = useCallback(
    (goal: TargetGoal) => {
      setWithdrawTarget(goal);
      setGoalYield(null);
      void getGoalYield(goal.id).then((y) =>
        setGoalYield(y ?? goal.accrued_yield),
      );
    },
    [getGoalYield],
  );

  if (!address) return null;

  // True only when the fast-forward is what makes the goal read as matured. A
  // fully funded goal is matured on both clocks, so it stays withdrawable.
  const withdrawSimulatedOnly =
    withdrawTarget !== null &&
    targetStatus(withdrawTarget, nowSecs) === "matured" &&
    targetStatus(withdrawTarget, realNowSecs) !== "matured";

  const confirmTopUp = async (amount: bigint) => {
    if (!topUpTarget) return;
    const ok = await manualDeposit(topUpTarget.id, amount);
    if (ok) {
      setTopUpTarget(null);
      void refreshBalance();
    }
  };

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    // The button is disabled in this state; guard anyway so the simulated clock
    // can never trigger a withdrawal that silently forfeits 1%.
    if (withdrawSimulatedOnly) return;
    const payout = await withdraw(withdrawTarget.id);
    if (payout !== null) {
      setWithdrawTarget(null);
      void refreshBalance();
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-72px)]">
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
              Target Savings
            </h1>
            <p className="mt-3 font-body text-[14.5px] leading-relaxed text-muted">
              Set a goal and let LoktIn auto-deposit toward it on a schedule you
              choose.
            </p>
          </div>
          <DashButton
            variant="primary"
            onClick={() => void navigate("/dashboard/targets/new")}
            className="w-full shrink-0 px-6 py-3 sm:w-auto"
          >
            Set a Goal
          </DashButton>
        </div>

        {lastError && !topUpTarget && !withdrawTarget && (
          <p className="mt-8 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 font-body text-[13px] text-red-300">
            {lastError}
          </p>
        )}

        {goals.length > 0 && (
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
            aria-label="Loading goals"
            className="flex justify-center py-24 text-cyan"
          >
            <Spinner className="h-8 w-8" />
          </div>
        ) : goals.length === 0 ? (
          <EmptyState
            onCreate={() => void navigate("/dashboard/targets/new")}
          />
        ) : visible.length === 0 ? (
          <p className="py-24 text-center font-body text-[14.5px] text-muted">
            No {filter.toLowerCase()} goals.
          </p>
        ) : (
          <>
            <ul className="mt-8 flex flex-col gap-4">
              {paged.map((g) => (
                <TargetRow
                  key={g.id.toString()}
                  goal={g}
                  nowSecs={nowSecs}
                  realNowSecs={realNowSecs}
                  onTopUp={setTopUpTarget}
                  onWithdraw={openWithdraw}
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

      {topUpTarget && (
        <TopUpModal
          goal={topUpTarget}
          balance={balance}
          balanceFormatted={balanceFormatted}
          submitting={submitting}
          error={lastError}
          onConfirm={(amt) => void confirmTopUp(amt)}
          onCancel={() => setTopUpTarget(null)}
        />
      )}

      {withdrawTarget && (
        <WithdrawModal
          goal={withdrawTarget}
          goalYield={goalYield}
          realNowSecs={realNowSecs}
          simulatedOnly={withdrawSimulatedOnly}
          submitting={submitting}
          error={lastError}
          onConfirm={() => void confirmWithdraw()}
          onCancel={() => setWithdrawTarget(null)}
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
        You currently have zero target savings
      </h2>
      <p className="mt-3 font-body text-[14.5px] text-muted">
        Click on “Set a Goal” to create your first target savings
      </p>
      <DashButton
        variant="primary"
        onClick={onCreate}
        className="mt-8 px-6 py-3"
      >
        Set a Goal
      </DashButton>
    </div>
  );
}
