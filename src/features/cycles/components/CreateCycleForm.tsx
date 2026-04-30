import { useState } from "react";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";

interface Props {
  onCreate: (months: number, usdc: number) => Promise<void>;
  loading: boolean;
}

export default function CreateCycleForm({ onCreate, loading }: Props) {
  const [months, setMonths] = useState("3");
  const [amount, setAmount] = useState("");

  const deposit = parseFloat(amount) || 0;
  const fee = deposit * 0.02;
  const available = deposit - fee;

  const handleSubmit = async () => {
    const m = parseInt(months);
    if (!m || m < 1 || m > 12 || deposit <= 0) return;
    await onCreate(m, deposit);
    setAmount("");
    setMonths("3");
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--sp-4)",
        }}
      >
        <Input
          label="Duration (months)"
          type="number"
          min="1"
          max="12"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          hint="1–12 months"
        />
        <Input
          label="Deposit Amount (USDC)"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          hint="Amount to lock"
        />
      </div>

      {deposit > 0 && (
        <div
          style={{
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            padding: "var(--sp-4)",
          }}
        >
          <div
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--fg-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "var(--sp-3)",
            }}
          >
            Summary
          </div>
          {[
            { label: "Deposit", value: `${deposit.toFixed(2)} USDC` },
            { label: "Platform fee (2%)", value: `-${fee.toFixed(2)} USDC` },
            {
              label: "Available for bills",
              value: `${available.toFixed(2)} USDC`,
            },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "var(--font-size-sm)",
                padding: "var(--sp-2) 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ color: "var(--fg-muted)" }}>{row.label}</span>
              <span
                style={{
                  color: row.label.includes("Available")
                    ? "var(--fg-primary)"
                    : "var(--fg-secondary)",
                  fontWeight: row.label.includes("Available") ? 600 : 400,
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
        disabled={!amount || deposit <= 0 || !months}
        isLoading={loading}
        style={{ alignSelf: "flex-start" }}
      >
        Create Plan →
      </Button>
    </div>
  );
}
