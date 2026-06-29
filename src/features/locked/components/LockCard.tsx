import { useState } from "react";
import { Lock } from "../hooks/useLocks";
import Card from "../../../shared/components/Card";
import Badge from "../../../shared/components/Badge";
import Button from "../../../shared/components/Button";

interface Props {
  lock: Lock;
  onUnlock: (id: bigint) => Promise<bigint | null>;
}

function formatDuration(seconds: bigint) {
  const total = Number(seconds);
  const days = Math.floor(total / 86_400);
  if (days >= 30) return `${Math.floor(days / 30)}mo`;
  return `${days}d`;
}

function formatCountdown(secondsRemaining: number) {
  if (secondsRemaining <= 0) return "Matured";
  const days = Math.floor(secondsRemaining / 86_400);
  const hours = Math.floor((secondsRemaining % 86_400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(secondsRemaining / 60)}m`;
}

export default function LockCard({ lock, onUnlock }: Props) {
  const principal = Number(lock.amount) / 10_000_000;
  const yieldUsd = Number(lock.projected_yield) / 10_000_000;
  const apyPct = lock.apy_basis_points / 100;
  const startDate = new Date(Number(lock.start_date) * 1000);
  const endDate = new Date(Number(lock.end_date) * 1000);
  const now = Date.now() / 1000;
  const totalDur = Number(lock.end_date) - Number(lock.start_date);
  const elapsed = Math.min(now - Number(lock.start_date), totalDur);
  const progress = totalDur > 0 ? (elapsed / totalDur) * 100 : 0;
  const secondsLeft = Math.max(0, Number(lock.end_date) - now);
  const isMature = now >= Number(lock.end_date);

  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = async () => {
    if (
      !confirm(
        `Unlock ${principal.toFixed(2)} USDC?\n\nPrincipal will be returned. Yield via Blend (coming soon).`,
      )
    )
      return;
    setUnlocking(true);
    try {
      const amt = await onUnlock(lock.id);
      if (amt !== null)
        alert(`Unlocked ${(Number(amt) / 10_000_000).toFixed(2)} USDC.`);
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <Card>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "var(--sp-5)",
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
            Lock #{lock.id.toString()}
          </p>
          <p
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            {principal.toFixed(2)}{" "}
            <span
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--fg-muted)",
                fontWeight: 400,
              }}
            >
              USDC
            </span>
          </p>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--fg-muted)",
              marginTop: "var(--sp-1)",
            }}
          >
            {formatDuration(lock.duration_seconds)} at {apyPct.toFixed(1)}% APY
          </p>
        </div>
        <Badge
          variant={
            lock.is_unlocked ? "ended" : isMature ? "active" : "recurring"
          }
        >
          {lock.is_unlocked ? "Unlocked" : isMature ? "Matured" : "Locked"}
        </Badge>
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
          { label: "Locked on", value: startDate.toLocaleDateString() },
          { label: "Unlocks on", value: endDate.toLocaleDateString() },
          {
            label: lock.is_unlocked
              ? "Status"
              : isMature
                ? "Status"
                : "Countdown",
            value: lock.is_unlocked ? "Returned" : formatCountdown(secondsLeft),
          },
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

      <div style={{ marginBottom: "var(--sp-5)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "var(--sp-2)",
            fontSize: "var(--font-size-xs)",
            color: "var(--fg-muted)",
          }}
        >
          <span>Lock progress</span>
          <span>{Math.round(progress)}%</span>
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
              width: `${progress}%`,
              background: "var(--accent-primary)",
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          padding: "var(--sp-3)",
          marginBottom: "var(--sp-4)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Projected Yield (Blend)
        </span>
        <span
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--accent-primary)",
            fontWeight: 600,
          }}
        >
          +{yieldUsd.toFixed(4)} USDC
        </span>
      </div>

      {!lock.is_unlocked && (
        <Button
          variant={isMature ? "primary" : "muted"}
          size="sm"
          onClick={() => void handleUnlock()}
          disabled={!isMature || unlocking}
          isLoading={unlocking}
        >
          {isMature
            ? "Unlock & Withdraw"
            : `Unlocks in ${formatCountdown(secondsLeft)}`}
        </Button>
      )}
    </Card>
  );
}
