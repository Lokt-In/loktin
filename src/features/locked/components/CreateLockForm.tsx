import { useState, useMemo } from "react";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";

interface Props {
  onLock: (amount: bigint, durationMonths: number) => void | Promise<void>;
  loading: boolean;
  apyTiers: Map<number, number>; // duration_months -> apy_bps
}

export default function CreateLockForm({ onLock, loading, apyTiers }: Props) {
  const [amount, setAmount] = useState("");
  const [durationMonths, setDurationMonths] = useState<number | null>(null);

  const tiersSorted = useMemo(
    () => Array.from(apyTiers.entries()).sort((a, b) => a[0] - b[0]),
    [apyTiers],
  );

  const amt = parseFloat(amount) || 0;
  const apyBps = durationMonths ? (apyTiers.get(durationMonths) ?? 0) : 0;
  const apyPct = apyBps / 100;
  // Same formula as on-chain: amount * apy_bps / 10000 * (months * 30days) / 365days
  const projectedYield = durationMonths
    ? amt * (apyBps / 10_000) * ((durationMonths * 30) / 365)
    : 0;

  const valid = amt > 0 && durationMonths !== null;

  const handleSubmit = async () => {
    if (!valid || durationMonths === null) return;
    await onLock(BigInt(Math.floor(amt * 10_000_000)), durationMonths);
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}
    >
      <Input
        label="Amount to Lock (USDC)"
        type="number"
        step="0.01"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

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
          Lock Duration
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${tiersSorted.length || 1}, 1fr)`,
            gap: 0,
            border: "1px solid var(--border)",
          }}
        >
          {tiersSorted.length === 0 && (
            <div
              style={{
                padding: "var(--sp-4)",
                color: "var(--fg-muted)",
                fontSize: "var(--font-size-sm)",
                textAlign: "center",
              }}
            >
              Loading APY tiers…
            </div>
          )}
          {tiersSorted.map(([months, bps]) => (
            <button
              key={months}
              onClick={() => setDurationMonths(months)}
              style={{
                background:
                  durationMonths === months
                    ? "var(--accent-primary)"
                    : "transparent",
                color:
                  durationMonths === months
                    ? "var(--fg-primary)"
                    : "var(--fg-secondary)",
                border: "none",
                padding: "var(--sp-4) var(--sp-3)",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "var(--sp-1)",
                alignItems: "center",
                transition: "all var(--transition-fast)",
              }}
            >
              <span
                style={{ fontSize: "var(--font-size-md)", fontWeight: 700 }}
              >
                {months} mo
              </span>
              <span style={{ fontSize: "var(--font-size-xs)", opacity: 0.85 }}>
                {(bps / 100).toFixed(1)}% APY
              </span>
            </button>
          ))}
        </div>
      </div>

      {valid && (
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
            Lock Summary
          </p>
          {[
            { label: "Principal locked", value: `${amt.toFixed(2)} USDC` },
            {
              label: "Duration",
              value: `${durationMonths} month${durationMonths !== 1 ? "s" : ""}`,
            },
            { label: "APY", value: `${apyPct.toFixed(2)}%` },
            {
              label: "Projected yield",
              value: `${projectedYield.toFixed(4)} USDC`,
              highlight: true,
            },
            {
              label: "Total at unlock",
              value: `${(amt + projectedYield).toFixed(4)} USDC`,
            },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "var(--font-size-sm)",
                padding: "var(--sp-2) 0",
                borderBottom: i < 4 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ color: "var(--fg-muted)" }}>{row.label}</span>
              <span
                style={{
                  color: row.highlight
                    ? "var(--accent-primary)"
                    : "var(--fg-primary)",
                  fontWeight: row.highlight ? 700 : 500,
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--fg-muted)",
              marginTop: "var(--sp-3)",
              lineHeight: 1.5,
            }}
          >
            Yield is projected and will be paid via Blend integration (coming
            soon). Today, unlock returns principal only.
          </p>
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
        Lock {amt > 0 ? `${amt.toFixed(2)} USDC` : "Funds"} →
      </Button>
    </div>
  );
}
