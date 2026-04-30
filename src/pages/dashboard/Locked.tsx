import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import {
  useLocks,
  LOCKED_VAULT_CONTRACT_ID,
} from "../../features/locked/hooks/useLocks";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";
import LockCard from "../../features/locked/components/LockCard";
import CreateLockForm from "../../features/locked/components/CreateLockForm";
import UsdcAllowance from "../../shared/components/UsdcAllowance";
import Button from "../../shared/components/Button";

export default function Locked() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const { locks, loading, submitting, lastError, apyTiers, lock, unlock } =
    useLocks();
  const { formatted: usdcFormatted, refresh: refreshBalance } =
    useUsdcBalance();
  const [showCreate, setShowCreate] = useState(false);
  const [pendingLock, setPendingLock] = useState<{
    amount: bigint;
    durationMonths: number;
  } | null>(null);

  useEffect(() => {
    if (!address) void navigate("/");
  }, [address]);
  if (!address) return null;

  const submit = (amount: bigint, durationMonths: number) => {
    setPendingLock({ amount, durationMonths });
  };

  const finishLock = async () => {
    if (!pendingLock) return;
    const id = await lock(pendingLock.amount, pendingLock.durationMonths);
    setPendingLock(null);
    if (id !== null) {
      setShowCreate(false);
      void refreshBalance();
      alert(
        `Lock #${id} created. Funds locked for ${pendingLock.durationMonths} month(s).`,
      );
    }
  };

  const totalLocked = locks
    .filter((l) => !l.is_unlocked)
    .reduce((sum, l) => sum + Number(l.amount) / 10_000_000, 0);
  const totalYield = locks
    .filter((l) => !l.is_unlocked)
    .reduce((sum, l) => sum + Number(l.projected_yield) / 10_000_000, 0);

  return (
    <div style={{ padding: "var(--sp-8) var(--sp-6)", maxWidth: 960 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "var(--sp-6)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: 700,
              marginBottom: "var(--sp-2)",
            }}
          >
            Locked In
          </h1>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--fg-muted)",
            }}
          >
            {locks.filter((l) => !l.is_unlocked).length} active lock
            {locks.filter((l) => !l.is_unlocked).length !== 1 ? "s" : ""} · no
            early withdrawal
          </p>
        </div>
        <Button
          variant={showCreate ? "ghost" : "primary"}
          size="md"
          onClick={() => {
            setShowCreate(!showCreate);
            setPendingLock(null);
          }}
        >
          {showCreate ? "← Cancel" : "+ New Lock"}
        </Button>
      </div>

      {/* Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
          border: "1px solid var(--border)",
          marginBottom: "var(--sp-6)",
        }}
      >
        {[
          { label: "Wallet", value: `${usdcFormatted} USDC` },
          { label: "Total Locked", value: `${totalLocked.toFixed(2)} USDC` },
          {
            label: "Projected Yield",
            value: `+${totalYield.toFixed(4)} USDC`,
            accent: true,
          },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: "var(--sp-4)",
              borderRight: i < 2 ? "1px solid var(--border)" : "none",
            }}
          >
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--fg-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "var(--sp-1)",
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: 600,
                color: s.accent ? "var(--accent-primary)" : "var(--fg-primary)",
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {lastError && (
        <div
          style={{
            border: "1px solid var(--status-error)",
            borderLeft: "4px solid var(--status-error)",
            padding: "var(--sp-3) var(--sp-4)",
            marginBottom: "var(--sp-6)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          <strong style={{ color: "var(--status-error)" }}>Error:</strong>{" "}
          <span style={{ color: "var(--fg-secondary)" }}>{lastError}</span>
        </div>
      )}

      {showCreate && (
        <div
          style={{
            border: "1px solid var(--border-accent)",
            padding: "var(--sp-8)",
            marginBottom: "var(--sp-8)",
            background: "var(--bg-surface)",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--fg-muted)",
              marginBottom: "var(--sp-6)",
            }}
          >
            New Lock
          </p>

          {!pendingLock && (
            <CreateLockForm
              onLock={submit}
              loading={submitting}
              apyTiers={apyTiers}
            />
          )}

          {pendingLock && (
            <div>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  marginBottom: "var(--sp-4)",
                }}
              >
                Locking{" "}
                <strong>
                  {(Number(pendingLock.amount) / 10_000_000).toFixed(2)} USDC
                </strong>{" "}
                for {pendingLock.durationMonths} month
                {pendingLock.durationMonths !== 1 ? "s" : ""}…
              </p>
              <UsdcAllowance
                spenderContract={LOCKED_VAULT_CONTRACT_ID}
                requiredAmount={pendingLock.amount}
                onReady={() => void finishLock()}
                label="Authorize the Locked Vault contract to transfer your USDC."
              />
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--fg-muted)",
                }}
              >
                Submitting lock…
              </p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "var(--sp-16)",
            color: "var(--fg-muted)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          Loading locks…
        </div>
      ) : locks.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "var(--sp-16)",
            border: "1px dashed var(--border)",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-3xl)",
              marginBottom: "var(--sp-4)",
              opacity: 0.3,
            }}
          >
            🔒
          </p>
          <p
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: 600,
              marginBottom: "var(--sp-3)",
            }}
          >
            No Locks Yet
          </p>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--fg-muted)",
              marginBottom: "var(--sp-6)",
              maxWidth: 480,
              margin: "0 auto var(--sp-6) auto",
            }}
          >
            Lock USDC for a fixed term (1–12 months) at a tiered APY. No early
            withdrawal.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreate(true)}
          >
            Lock First USDC →
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--sp-4)",
          }}
        >
          {locks.map((l) => (
            <LockCard key={l.id.toString()} lock={l} onUnlock={unlock} />
          ))}
        </div>
      )}
    </div>
  );
}
