import { useState } from "react";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";

const PERIODS = [
  { label: "Weekly", seconds: 604_800 },
  { label: "Biweekly", seconds: 1_209_600 },
  { label: "Monthly", seconds: 2_592_000 },
];

interface Props {
  onCreate: (
    name: string,
    targetAmount: bigint,
    periodSeconds: bigint,
    periodAmount: bigint,
    endDate: bigint,
  ) => void | Promise<void>;
  loading: boolean;
}

export default function CreateTargetForm({ onCreate, loading }: Props) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [periodSec, setPeriodSec] = useState(2_592_000); // monthly default
  const [perPeriod, setPerPeriod] = useState("");
  const [endDate, setEndDate] = useState("");

  const targetAmt = parseFloat(target) || 0;
  const periodAmt = parseFloat(perPeriod) || 0;
  const endTs = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : 0;
  const startTs = Math.floor(Date.now() / 1000);

  const numPeriods =
    endTs > startTs && periodSec > 0
      ? Math.floor((endTs - startTs) / periodSec)
      : 0;
  const projected = numPeriods * periodAmt;

  const valid =
    !!name.trim() &&
    targetAmt > 0 &&
    periodAmt > 0 &&
    endTs > startTs &&
    periodAmt <= targetAmt;

  const handleSubmit = async () => {
    if (!valid) return;
    await onCreate(
      name.trim(),
      BigInt(Math.floor(targetAmt * 10_000_000)),
      BigInt(periodSec),
      BigInt(Math.floor(periodAmt * 10_000_000)),
      BigInt(endTs),
    );
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}
    >
      <Input
        label="Goal Name"
        placeholder="e.g. Trip to Tokyo"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--sp-4)",
        }}
      >
        <Input
          label="Target Amount (USDC)"
          type="number"
          step="0.01"
          min="1"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <Input
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <div>
        <label
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--fg-muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "var(--sp-2)",
            display: "block",
          }}
        >
          Deposit Frequency
        </label>
        <div
          style={{ display: "flex", gap: 0, border: "1px solid var(--border)" }}
        >
          {PERIODS.map((p) => (
            <button
              key={p.seconds}
              onClick={() => setPeriodSec(p.seconds)}
              style={{
                flex: 1,
                background:
                  periodSec === p.seconds
                    ? "var(--accent-primary)"
                    : "transparent",
                color:
                  periodSec === p.seconds
                    ? "var(--fg-primary)"
                    : "var(--fg-muted)",
                border: "none",
                padding: "var(--sp-3)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Amount per period (USDC)"
        type="number"
        step="0.01"
        min="0.01"
        value={perPeriod}
        onChange={(e) => setPerPeriod(e.target.value)}
        hint={
          periodAmt > targetAmt && targetAmt > 0
            ? "Per-period exceeds target"
            : undefined
        }
      />

      {projected > 0 && (
        <div
          style={{
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            padding: "var(--sp-4)",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--fg-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "var(--sp-3)",
            }}
          >
            Projection
          </p>
          {[
            { label: "Periods until end date", value: `${numPeriods}` },
            {
              label: "Projected total deposited",
              value: `${projected.toFixed(2)} USDC`,
            },
            { label: "Goal target", value: `${targetAmt.toFixed(2)} USDC` },
            {
              label: projected >= targetAmt ? "On track ✓" : "Shortfall",
              value:
                projected >= targetAmt
                  ? "Goal will be met"
                  : `${(targetAmt - projected).toFixed(2)} USDC short`,
            },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "var(--font-size-sm)",
                padding: "var(--sp-2) 0",
                borderBottom: i < 3 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ color: "var(--fg-muted)" }}>{row.label}</span>
              <span
                style={{
                  color: row.label.includes("track")
                    ? "var(--status-success)"
                    : row.label.includes("Shortfall")
                      ? "var(--status-warning)"
                      : "var(--fg-primary)",
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        onClick={() => void handleSubmit()}
        disabled={!valid}
        isLoading={loading}
        style={{ alignSelf: "flex-start" }}
      >
        Create Goal →
      </Button>
    </div>
  );
}
