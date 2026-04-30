import { useState } from "react";
import { TargetGoal } from "../hooks/useTargets";
import Card from "../../../shared/components/Card";
import Badge from "../../../shared/components/Badge";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import Modal from "../../../shared/components/Modal";

const PERIOD_NAMES: Record<number, string> = {
  604_800: "Weekly",
  1_209_600: "Biweekly",
  2_592_000: "Monthly",
};

interface Props {
  goal: TargetGoal;
  onManualDeposit: (id: bigint, amount: bigint) => Promise<boolean>;
  onWithdraw: (id: bigint) => Promise<bigint | null>;
}

export default function TargetCard({
  goal,
  onManualDeposit,
  onWithdraw,
}: Props) {
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [pending, setPending] = useState(false);

  const target = Number(goal.target_amount) / 10_000_000;
  const dep = Number(goal.deposited) / 10_000_000;
  const perPer = Number(goal.period_amount) / 10_000_000;
  const pct = target > 0 ? Math.min(100, (dep / target) * 100) : 0;
  const endDate = new Date(Number(goal.end_date) * 1000);
  const startDate = new Date(Number(goal.start_date) * 1000);
  const now = Date.now() / 1000;
  const isMature = now >= Number(goal.end_date);
  const periodLabel =
    PERIOD_NAMES[Number(goal.period_seconds)] ??
    `every ${Math.floor(Number(goal.period_seconds) / 86400)}d`;

  const nextDue = Number(goal.last_deposit_date) + Number(goal.period_seconds);
  const daysUntilNext = Math.max(0, Math.ceil((nextDue - now) / 86400));

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) return;
    setPending(true);
    const ok = await onManualDeposit(
      goal.id,
      BigInt(Math.floor(amt * 10_000_000)),
    );
    setPending(false);
    if (ok) {
      setShowDeposit(false);
      setDepositAmount("");
    }
  };

  const handleWithdraw = async () => {
    const msg = isMature
      ? `Withdraw ${dep.toFixed(2)} USDC from "${goal.name}"?`
      : `Withdraw early?\n\nGoal ends ${endDate.toLocaleDateString()}.\nA 1% forfeit (${(dep * 0.01).toFixed(2)} USDC) will be deducted.\nYou'll receive ${(dep * 0.99).toFixed(2)} USDC.\n\nContinue?`;
    if (!confirm(msg)) return;
    const result = await onWithdraw(goal.id);
    if (result !== null)
      alert(`Withdrew ${(Number(result) / 10_000_000).toFixed(2)} USDC.`);
  };

  return (
    <>
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "var(--sp-4)",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--fg-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "var(--sp-1)",
              }}
            >
              Goal #{goal.id.toString()}
            </p>
            <p style={{ fontSize: "var(--font-size-lg)", fontWeight: 600 }}>
              {goal.name}
            </p>
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--fg-muted)",
                marginTop: "var(--sp-1)",
              }}
            >
              {periodLabel} · {perPer.toFixed(2)} USDC per period · ends{" "}
              {endDate.toLocaleDateString()}
            </p>
          </div>
          <Badge
            variant={
              goal.is_complete ? "ended" : isMature ? "active" : "pending"
            }
          >
            {goal.is_complete ? "Complete" : isMature ? "Matured" : "Active"}
          </Badge>
        </div>

        <div style={{ marginBottom: "var(--sp-4)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "var(--sp-2)",
              fontSize: "var(--font-size-xs)",
            }}
          >
            <span style={{ color: "var(--fg-muted)" }}>
              Saved {dep.toFixed(2)} of {target.toFixed(2)} USDC
            </span>
            <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
              {pct.toFixed(0)}%
            </span>
          </div>
          <div
            style={{
              height: 4,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: "var(--accent-primary)",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--sp-4)",
            marginBottom: "var(--sp-5)",
          }}
        >
          {[
            { label: "Started", value: startDate.toLocaleDateString() },
            {
              label: "Next deposit",
              value: goal.is_complete
                ? "—"
                : daysUntilNext === 0
                  ? "Today"
                  : `${daysUntilNext}d`,
            },
            { label: "Missed periods", value: `${goal.missed_periods}` },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                borderLeft: "2px solid var(--border)",
                paddingLeft: "var(--sp-3)",
              }}
            >
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--fg-muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "var(--sp-1)",
                }}
              >
                {s.label}
              </p>
              <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {!goal.is_complete && (
          <div style={{ display: "flex", gap: "var(--sp-3)" }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeposit(true)}
            >
              + Top Up
            </Button>
            <Button
              variant={isMature ? "primary" : "danger"}
              size="sm"
              onClick={() => void handleWithdraw()}
            >
              {isMature ? "Withdraw" : "Early Withdraw (-1%)"}
            </Button>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showDeposit}
        onClose={() => setShowDeposit(false)}
        title="Manual Top-Up"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--sp-4)",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--fg-secondary)",
            }}
          >
            Add an extra deposit to "{goal.name}". This is on top of your
            scheduled {periodLabel.toLowerCase()} deposits.
          </p>
          <Input
            label="Amount (USDC)"
            type="number"
            step="0.01"
            min="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <div style={{ display: "flex", gap: "var(--sp-3)" }}>
            <Button
              variant="primary"
              size="md"
              onClick={() => void handleDeposit()}
              isLoading={pending}
              disabled={!depositAmount}
            >
              Deposit
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setShowDeposit(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
