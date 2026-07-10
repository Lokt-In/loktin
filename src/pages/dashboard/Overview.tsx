import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";
import { useLocks } from "../../features/locked/hooks/useLocks";
import { useTargets } from "../../features/targets/hooks/useTargets";
import {
  useActivity,
  type ActivityKind,
} from "../../features/activity/hooks/useActivity";
import { formatUsdc } from "../../shared/lib/money";
import { formatRelative } from "../../shared/lib/relativeTime";
import DashButton from "../../shared/dash/DashButton";
import Spinner from "../../shared/dash/Spinner";

export default function Overview() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const { formatted: balanceFormatted, loading: balLoading } = useUsdcBalance();
  const { locks } = useLocks();
  const { goals } = useTargets();
  const { activity, loading: actLoading } = useActivity(goals);

  const [nowSecs, setNowSecs] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(
      () => setNowSecs(Math.floor(Date.now() / 1000)),
      60_000,
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!address) void navigate("/");
  }, [address, navigate]);

  const stats = useMemo(() => {
    const activeLocks = locks.filter((l) => !l.is_unlocked);
    const activeGoals = goals.filter((g) => !g.is_complete);
    const totalLocked = activeLocks.reduce((s, l) => s + l.amount, 0n);
    const totalSaved = activeGoals.reduce((s, g) => s + g.deposited, 0n);
    // Locks: projected_yield is fixed at lock time, paid at maturity. Goals:
    // accrued_yield is settled up to last_yield_update (lags slightly). Both are
    // "projected" enough to sum under one honest label.
    const projectedYield =
      activeLocks.reduce((s, l) => s + l.projected_yield, 0n) +
      activeGoals.reduce((s, g) => s + g.accrued_yield, 0n);
    return {
      lockCount: activeLocks.length,
      goalCount: activeGoals.length,
      totalLocked,
      totalSaved,
      projectedYield,
    };
  }, [locks, goals]);

  if (!address) return null;

  return (
    <div className="relative min-h-[calc(100vh-72px)]">
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
        <h1 className="font-heading text-[30px] font-bold text-white sm:text-[38px]">
          Welcome!
        </h1>

        {/* Stat tiles */}
        <div className="mt-10 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Wallet Balance"
            value={balLoading ? "—" : balanceFormatted}
            accent
          />
          <StatTile
            label="Total Locked"
            value={formatUsdc(stats.totalLocked)}
            caption={`Across ${stats.lockCount} lock${stats.lockCount === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Total Saved"
            value={formatUsdc(stats.totalSaved)}
            caption={`Across ${stats.goalCount} goal${stats.goalCount === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Projected Yield"
            value={`+${formatUsdc(stats.projectedYield)}`}
            caption="Across locks & goals"
          />
        </div>

        {/* Coming soon */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ComingSoon
            title="Plans"
            body="Lock USDC against a schedule of upcoming bill payments, so recurring expenses are already set aside before you're tempted to spend them elsewhere."
          />
          <ComingSoon
            title="Spend & Save"
            body="Automatically routes a set percentage of every spend into a side vault — a round-up style habit for building savings passively."
          />
        </div>

        {/* Activity + CTAs */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#ffffff14] bg-[#101116] p-6">
            <h2 className="font-heading text-[19px] font-bold text-[#eef0f7]">
              Recent Activity
            </h2>

            {actLoading ? (
              <div
                role="status"
                aria-label="Loading activity"
                className="flex justify-center py-12 text-cyan"
              >
                <Spinner className="h-6 w-6" />
              </div>
            ) : activity.length === 0 ? (
              <p className="py-12 text-center font-body text-[13.5px] text-muted">
                No recent on-chain activity. Create a lock or a goal to get
                started.
              </p>
            ) : (
              <ul className="mt-5 flex flex-col">
                {activity.slice(0, 6).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-4 border-b border-[#ffffff0a] py-3.5 last:border-b-0"
                  >
                    <ActivityIcon kind={a.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-[14.5px] font-bold text-[#eef0f7]">
                        {a.title}
                      </p>
                      <p className="truncate font-body text-[12.5px] text-muted">
                        {a.detail}
                      </p>
                    </div>
                    <span className="shrink-0 font-body text-[12px] text-muted">
                      {formatRelative(a.at, nowSecs)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-4">
            <CtaCard
              title="New Lock"
              body="Lock USDC for a fixed term. The contract won't release it before maturity — not to anyone, including LoktIn. Yield accrues from Blend the whole time it's locked."
              cta="Create Locked Savings"
              onClick={() => void navigate("/dashboard/locked/new")}
            />
            <CtaCard
              title="New Goal"
              body="Set a goal and let LoktIn auto-deposit toward it on a schedule you choose."
              cta="Set a Goal"
              onClick={() => void navigate("/dashboard/targets/new")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  caption,
  accent,
}: {
  label: string;
  value: string;
  caption?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#FFFFFF24] bg-[#101116] p-5">
      <p className="font-body text-[13px] text-muted">{label}</p>
      <p
        className={`mt-3 font-heading text-[26px] font-bold ${accent ? "text-cyan" : "text-[#eef0f7]"}`}
      >
        {value}{" "}
        <span className="text-[16px] font-semibold text-muted">USDC</span>
      </p>
      {caption && (
        <p className="mt-2 font-body text-[12.5px] text-muted">{caption}</p>
      )}
    </div>
  );
}

function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[#FFFFFF24] bg-[#101116] p-6">
      <div className="flex items-center gap-3">
        <h2 className="font-heading text-[19px] font-bold text-[#eef0f7]">
          {title}
        </h2>
        <span className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-1 font-body text-[11px] font-bold tracking-wide text-violet-300 uppercase">
          Coming soon
        </span>
      </div>
      <p className="mt-3 font-body text-[13.5px] leading-relaxed text-muted">
        {body}
      </p>
    </div>
  );
}

function CtaCard({
  title,
  body,
  cta,
  onClick,
}: {
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-[#FFFFFF24] bg-[#101116] p-6">
      <h2 className="font-heading text-[19px] font-bold text-[#eef0f7]">
        {title}
      </h2>
      <p className="mt-3 font-body text-[13.5px] leading-relaxed text-muted">
        {body}
      </p>
      <DashButton
        // variant="secondary"
        onClick={onClick}
        className="mt-5 self-start bg-cyan/5 text-cyan hover:bg-primary/10 border border-cyan hover:border-cyan/40"
      >
        {cta}
      </DashButton>
    </div>
  );
}

const ICON_STYLES: Record<ActivityKind, string> = {
  lock: "border-cyan/20 bg-cyan/10 text-cyan",
  unlock: "border-cyan/20 bg-cyan/10 text-cyan",
  "goal-created": "border-cyan/20 bg-cyan/10 text-cyan",
  "top-up": "border-[#34E0A14D] bg-[#34E0A114] text-[#34E0A1]",
  "period-deposit": "border-[#34E0A14D] bg-[#34E0A114] text-[#34E0A1]",
  withdraw: "border-[#ffffff14] bg-[#ffffff0a] text-subtle",
  missed: "border-red-500/40 bg-red-500/10 text-red-400",
};

function ActivityIcon({ kind }: { kind: ActivityKind }): ReactNode {
  const lockish = kind === "lock" || kind === "unlock";
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${ICON_STYLES[kind]}`}
    >
      {lockish ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M2.84651 12.5631C2.99643 13.6767 3.91872 14.549 5.04108 14.6006C5.98548 14.644 6.94484 14.6667 8.0013 14.6667C9.05777 14.6667 10.0171 14.644 10.9615 14.6006C12.0839 14.549 13.0062 13.6767 13.1561 12.5631C13.254 11.8365 13.3346 11.0917 13.3346 10.3333C13.3346 9.57493 13.254 8.8302 13.1561 8.10353C13.0062 6.99 12.0839 6.11766 10.9615 6.06606C10.0171 6.02265 9.05777 6 8.0013 6C6.94484 6 5.98548 6.02265 5.04108 6.06606C3.91872 6.11766 2.99643 6.99 2.84651 8.10353C2.74867 8.8302 2.66797 9.57493 2.66797 10.3333C2.66797 11.0917 2.74867 11.8365 2.84651 12.5631Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M5 6.00016V4.3335C5 2.67664 6.34315 1.3335 8 1.3335C9.65687 1.3335 11 2.67664 11 4.3335V6.00016"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle
            cx="8"
            cy="8"
            r="6.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle
            cx="8"
            cy="8"
            r="2.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      )}
    </span>
  );
}
