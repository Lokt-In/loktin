import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";
import { useCycles } from "../../features/cycles/hooks/useCycles";
import { useTargets } from "../../features/targets/hooks/useTargets";
import { useLocks } from "../../features/locked/hooks/useLocks";
import { useSpendSave } from "../../features/spend_save/hooks/useSpendSave";
import Card from "../../shared/components/Card";
import Button from "../../shared/components/Button";

interface SummaryItem {
  to: string;
  label: string;
  count: string;
  value: string;
}

export default function Overview() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const { formatted: usdcFormatted, loading: balanceLoading } =
    useUsdcBalance();
  const { cycleIds, loadCycles } = useCycles();
  const { goals } = useTargets();
  const { locks } = useLocks();
  const { position: spendSavePosition } = useSpendSave();

  useEffect(() => {
    if (!address) {
      void navigate("/");
      return;
    }
    void loadCycles();
  }, [address]);

  if (!address) return null;

  // ── Aggregate calculations across all primitives ──
  const targetsActive = goals.filter((g) => !g.is_complete).length;
  const targetsLocked = goals
    .filter((g) => !g.is_complete)
    .reduce((sum, g) => sum + Number(g.deposited) / 10_000_000, 0);

  const locksActive = locks.filter((l) => !l.is_unlocked).length;
  const locksLocked = locks
    .filter((l) => !l.is_unlocked)
    .reduce((sum, l) => sum + Number(l.amount) / 10_000_000, 0);
  const projectedYield = locks
    .filter((l) => !l.is_unlocked)
    .reduce((sum, l) => sum + Number(l.projected_yield) / 10_000_000, 0);

  const ssBalance = spendSavePosition
    ? Number(spendSavePosition.saved_balance) / 10_000_000
    : 0;
  const ssRate = spendSavePosition
    ? spendSavePosition.save_percentage / 100
    : 0;

  const totalLocked = targetsLocked + locksLocked + ssBalance;

  const items: SummaryItem[] = [
    {
      to: "/dashboard/plans",
      label: "Plans",
      count: `${cycleIds.length} active`,
      value: "—",
    },
    {
      to: "/dashboard/targets",
      label: "Target Savings",
      count: targetsActive ? `${targetsActive} active` : "0 active",
      value: targetsLocked > 0 ? `${targetsLocked.toFixed(2)} USDC` : "—",
    },
    {
      to: "/dashboard/locked",
      label: "Locked In",
      count: locksActive ? `${locksActive} active` : "0 active",
      value: locksLocked > 0 ? `${locksLocked.toFixed(2)} USDC` : "—",
    },
    {
      to: "/dashboard/spend-save",
      label: "Spend & Save",
      count: spendSavePosition ? `${ssRate.toFixed(1)}% rate` : "Not enrolled",
      value: ssBalance > 0 ? `${ssBalance.toFixed(2)} USDC` : "—",
    },
  ];

  return (
    <div style={{ padding: "var(--sp-8) var(--sp-6)", maxWidth: 1100 }}>
      <div style={{ marginBottom: "var(--sp-8)" }}>
        <h1
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            marginBottom: "var(--sp-2)",
          }}
        >
          Overview
        </h1>
        <p
          style={{ fontSize: "var(--font-size-sm)", color: "var(--fg-muted)" }}
        >
          Your savings primitives at a glance.
        </p>
      </div>

      {/* Top stats — wallet + total locked + projected yield */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
          border: "1px solid var(--border-accent)",
          marginBottom: "var(--sp-8)",
          background: "var(--bg-surface)",
        }}
      >
        {[
          {
            label: "USDC Wallet Balance",
            value: balanceLoading ? "…" : usdcFormatted,
            unit: "USDC",
          },
          {
            label: "Total Locked",
            value: totalLocked.toFixed(2),
            unit: "USDC",
          },
          {
            label: "Projected Yield",
            value: `+${projectedYield.toFixed(4)}`,
            unit: "USDC",
            accent: true,
          },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: "var(--sp-5) var(--sp-6)",
              borderRight: i < 2 ? "1px solid var(--border)" : "none",
            }}
          >
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--fg-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "var(--sp-2)",
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                fontSize: "var(--font-size-2xl)",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: s.accent ? "var(--accent-primary)" : "var(--fg-primary)",
              }}
            >
              {s.value}{" "}
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--fg-muted)",
                  fontWeight: 400,
                }}
              >
                {s.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Per-product summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "var(--sp-4)",
          marginBottom: "var(--sp-8)",
        }}
      >
        {items.map((item) => (
          <Card
            key={item.to}
            hoverable
            onClick={() => {
              void navigate(item.to);
            }}
          >
            <p
              style={{
                fontSize: "var(--font-size-lg)",
                fontWeight: 600,
                marginBottom: "var(--sp-2)",
              }}
            >
              {item.label}
            </p>
            <p
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: 700,
                color: "var(--fg-primary)",
                marginBottom: "var(--sp-3)",
              }}
            >
              {item.value}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "var(--sp-4)",
                borderTop: "1px solid var(--border)",
                paddingTop: "var(--sp-3)",
              }}
            >
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--fg-secondary)",
                }}
              >
                {item.count}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--accent-primary)",
                  fontWeight: 600,
                }}
              >
                Open →
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ borderStyle: "dashed" }}>
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--accent-primary)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "var(--sp-2)",
          }}
        >
          Coming Soon
        </p>
        <p
          style={{
            fontSize: "var(--font-size-md)",
            fontWeight: 600,
            marginBottom: "var(--sp-2)",
          }}
        >
          Earn yield via Blend
        </p>
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--fg-secondary)",
            lineHeight: 1.6,
            marginBottom: "var(--sp-4)",
          }}
        >
          When Blend integration is live, every USDC locked in your savings
          primitives will generate yield while you wait. Your bills still pay on
          time. Your money does double duty.
        </p>
        <Button variant="ghost" size="sm" disabled>
          Notify me when live
        </Button>
      </Card>
    </div>
  );
}
