import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import * as LockedInContract from "lockedin";
import { rpcUrl } from "../contracts/util";
import Card from "../shared/components/Card";
import Badge from "../shared/components/Badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const COLORS = ["#514D80", "#594157", "#8DA7BE", "#1C434A", "#263054"];

function makeClient(address: string) {
  return new LockedInContract.Client({
    ...LockedInContract.networks.testnet,
    rpcUrl,
    publicKey: address,
  });
}

function extractValue(val: unknown): bigint {
  if (typeof val === "bigint") return val;
  if (typeof val === "number") return BigInt(val);
  if (typeof val === "string") return BigInt(val);
  if (val && typeof val === "object") {
    const v = val as {
      i128?: string | number;
      u64?: string | number;
      u32?: string | number;
    };
    const raw = v.i128 ?? v.u64 ?? v.u32 ?? 0;
    return BigInt(raw);
  }
  return 0n;
}

type Stats = {
  totalCycles: number;
  activeCycles: number;
  totalDeposited: number;
  totalBills: number;
  paidBills: number;
  pendingBills: number;
  totalAllocated: number;
  spendingByMonth: { month: string; paid: number; pending: number }[];
  healthScore: number;
};

async function fetchStats(address: string): Promise<Stats> {
  const contract = makeClient(address);
  const { result: cycleIds } = await contract.get_user_cycles({
    user: address,
  });

  let totalDeposited = 0,
    totalBills = 0,
    paidBills = 0,
    activeCycles = 0;
  const monthlyPaid: Record<number, number> = {};
  const monthlyPending: Record<number, number> = {};

  for (const cycleId of cycleIds ?? []) {
    const ctxRaw = await (
      await contract.get_cycle({ cycle_id: cycleId })
    ).simulate();
    const cycleData = ((ctxRaw.result as { value?: unknown })?.value ??
      ctxRaw.result) as Record<string, unknown>;
    if (!cycleData) continue;

    const deposited =
      Number(extractValue(cycleData.total_deposited)) / 10_000_000;
    const fee = Number(extractValue(cycleData.operating_fee)) / 10_000_000;
    totalDeposited += deposited - fee;
    if (cycleData.is_active) activeCycles++;

    const btx = await contract.get_cycle_bills({ cycle_id: cycleId });
    const bsim = await btx.simulate();
    const billIds = ((bsim.result as { value?: unknown })?.value ??
      bsim.result ??
      []) as bigint[];

    for (const billId of billIds) {
      const billRaw = await (
        await contract.get_bill({ bill_id: billId })
      ).simulate();
      const b = ((billRaw.result as { value?: unknown })?.value ??
        billRaw.result) as Record<string, unknown>;
      if (!b) continue;

      totalBills++;
      const amt = Number(extractValue(b.amount)) / 10_000_000;
      const due = new Date(Number(extractValue(b.due_date)) * 1000);
      const mon = due.getMonth(); // 0-11

      if (b.is_paid) {
        paidBills++;
        monthlyPaid[mon] = (monthlyPaid[mon] ?? 0) + amt;
      } else {
        monthlyPending[mon] = (monthlyPending[mon] ?? 0) + amt;
      }
    }
  }

  // Build 6-month rolling window
  const now = new Date();
  const spendingByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const m = d.getMonth();
    return {
      month: MONTHS[m],
      paid: Math.round((monthlyPaid[m] ?? 0) * 100) / 100,
      pending: Math.round((monthlyPending[m] ?? 0) * 100) / 100,
    };
  });

  const totalCycles = (cycleIds ?? []).length;
  const onTimeRate = totalBills > 0 ? paidBills / totalBills : 1;
  const cycleRate = totalCycles > 0 ? activeCycles / totalCycles : 1;
  const healthScore = Math.round(onTimeRate * 50 + cycleRate * 30 + 20);
  const totalAllocated =
    Object.values(monthlyPaid).reduce((a, b) => a + b, 0) +
    Object.values(monthlyPending).reduce((a, b) => a + b, 0);

  return {
    totalCycles,
    activeCycles,
    totalDeposited,
    totalBills,
    paidBills,
    pendingBills: totalBills - paidBills,
    totalAllocated,
    spendingByMonth,
    healthScore,
  };
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        padding: "var(--sp-3)",
        fontSize: "var(--font-size-xs)",
      }}
    >
      <p style={{ marginBottom: "var(--sp-2)", color: "var(--fg-muted)" }}>
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: "var(--fg-primary)" }}>
          {p.name}: {p.value.toFixed(2)} USDC
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      void navigate("/");
      return;
    }
    void fetchStats(address)
      .then((s) => {
        setStats(s);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [address]);

  if (!address) return null;

  const scoreColor = !stats
    ? "var(--fg-muted)"
    : stats.healthScore >= 80
      ? "var(--status-success)"
      : stats.healthScore >= 50
        ? "var(--status-warning)"
        : "var(--status-error)";

  const pieData = stats
    ? [
        { name: "Paid", value: stats.paidBills },
        { name: "Pending", value: stats.pendingBills },
      ]
    : [];

  return (
    <div className="container" style={{ padding: "var(--sp-10) var(--sp-6)" }}>
      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          fontWeight: 700,
          marginBottom: "var(--sp-8)",
        }}
      >
        Analytics
      </h1>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "var(--sp-16)",
            color: "var(--fg-muted)",
          }}
        >
          Loading data…
        </div>
      ) : !stats ? (
        <p style={{ color: "var(--fg-muted)" }}>No data available.</p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--sp-6)",
          }}
        >
          {/* KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 0,
              border: "1px solid var(--border)",
            }}
          >
            {[
              { label: "Total Plans", value: stats.totalCycles },
              { label: "Active Plans", value: stats.activeCycles },
              { label: "Total Bills", value: stats.totalBills },
              { label: "Bills Paid", value: stats.paidBills },
              {
                label: "Total Deposited",
                value: `${stats.totalDeposited.toFixed(2)} USDC`,
              },
            ].map((kpi, i) => (
              <div
                key={kpi.label}
                style={{
                  padding: "var(--sp-6)",
                  borderRight: i < 4 ? "1px solid var(--border)" : "none",
                }}
              >
                <p
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--fg-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "var(--sp-2)",
                  }}
                >
                  {kpi.label}
                </p>
                <p
                  style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}
                >
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "var(--sp-6)",
            }}
          >
            {/* Spending Chart */}
            <Card>
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--fg-muted)",
                  marginBottom: "var(--sp-5)",
                }}
              >
                6-Month Spending
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={stats.spendingByMonth}
                  margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 10,
                      fill: "var(--fg-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: "var(--fg-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="paid"
                    name="Paid"
                    stroke="#514D80"
                    fill="rgba(81,77,128,0.15)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="pending"
                    name="Pending"
                    stroke="#594157"
                    fill="rgba(89,65,87,0.1)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Health Score */}
            <Card
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--fg-muted)",
                  marginBottom: "var(--sp-6)",
                }}
              >
                Financial Health
              </p>
              <div
                style={{ position: "relative", marginBottom: "var(--sp-4)" }}
              >
                <svg width={120} height={120} viewBox="0 0 120 120">
                  <circle
                    cx={60}
                    cy={60}
                    r={50}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth={8}
                  />
                  <circle
                    cx={60}
                    cy={60}
                    r={50}
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth={8}
                    strokeDasharray={`${(stats.healthScore / 100) * 314} 314`}
                    strokeLinecap="square"
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dasharray 1s ease" }}
                  />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--font-size-2xl)",
                      fontWeight: 700,
                      color: scoreColor,
                    }}
                  >
                    {stats.healthScore}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--fg-muted)",
                    }}
                  >
                    /100
                  </span>
                </div>
              </div>
              <Badge
                variant={
                  stats.healthScore >= 80
                    ? "active"
                    : stats.healthScore >= 50
                      ? "pending"
                      : "emergency"
                }
              >
                {stats.healthScore >= 80
                  ? "Excellent"
                  : stats.healthScore >= 50
                    ? "Fair"
                    : "Needs Attention"}
              </Badge>
            </Card>
          </div>

          {/* Bill breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--sp-6)",
            }}
          >
            <Card>
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--fg-muted)",
                  marginBottom: "var(--sp-5)",
                }}
              >
                Bill Status Breakdown
              </p>
              {stats.totalBills > 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--sp-6)",
                  }}
                >
                  <PieChart width={120} height={120}>
                    <Pie
                      data={pieData}
                      cx={55}
                      cy={55}
                      outerRadius={50}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--sp-3)",
                    }}
                  >
                    {pieData.map((d, i) => (
                      <div
                        key={d.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--sp-2)",
                          fontSize: "var(--font-size-sm)",
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            background: COLORS[i],
                            display: "inline-block",
                          }}
                        />
                        <span style={{ color: "var(--fg-secondary)" }}>
                          {d.name}:
                        </span>
                        <span style={{ fontWeight: 600 }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    color: "var(--fg-muted)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  No bills to display.
                </p>
              )}
            </Card>

            {/* Blend Earnings Placeholder */}
            <Card
              style={{
                border: "1px dashed var(--border-accent)",
                background: "transparent",
              }}
            >
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--accent-primary)",
                  marginBottom: "var(--sp-4)",
                }}
              >
                Blend Yield — Coming Soon
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-3xl)",
                  fontWeight: 700,
                  color: "var(--fg-muted)",
                  marginBottom: "var(--sp-2)",
                }}
              >
                —
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--fg-muted)",
                  lineHeight: 1.6,
                }}
              >
                Once Blend integration is live, your locked funds will generate
                yield. Earnings will appear here.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
