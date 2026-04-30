import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import { useCycles } from "../../features/cycles/hooks/useCycles";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";
import CycleCard from "../../features/cycles/components/CycleCard";
import CreateCycleForm from "../../features/cycles/components/CreateCycleForm";
import Button from "../../shared/components/Button";

export default function Plans() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const { cycleIds, loading, creating, loadCycles, createCycle, lastError } =
    useCycles();
  const {
    formatted: usdcFormatted,
    loading: balanceLoading,
    refresh: refreshBalance,
  } = useUsdcBalance();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!address) {
      void navigate("/");
      return;
    }
    void loadCycles();
  }, [address]);

  if (!address) return null;

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
              letterSpacing: "-0.01em",
              marginBottom: "var(--sp-2)",
            }}
          >
            Plans
          </h1>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--fg-muted)",
            }}
          >
            {cycleIds.length} active plan{cycleIds.length !== 1 ? "s" : ""} ·
            time-locked bill payment cycles
          </p>
        </div>
        <Button
          variant={showCreate ? "ghost" : "primary"}
          size="md"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "← Cancel" : "+ New Plan"}
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "var(--sp-4)",
          alignItems: "center",
          padding: "var(--sp-4) var(--sp-5)",
          border: "1px solid var(--border)",
          marginBottom: "var(--sp-6)",
          background: "var(--bg-surface)",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "var(--sp-1)",
            }}
          >
            USDC Wallet Balance
          </p>
          <p
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            {balanceLoading ? "…" : usdcFormatted}{" "}
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
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refreshBalance()}>
          ↻ Refresh
        </Button>
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
          <strong style={{ color: "var(--status-error)" }}>Last error:</strong>{" "}
          <span
            style={{ color: "var(--fg-secondary)", wordBreak: "break-word" }}
          >
            {lastError}
          </span>
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
            New Plan
          </p>
          <CreateCycleForm
            loading={creating}
            onCreate={async (months, usdc) => {
              const id = await createCycle(months, usdc);
              if (id !== null) {
                setShowCreate(false);
                void refreshBalance();
                alert(`Plan #${id} created! You can now add bills.`);
              }
            }}
          />
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
          Loading plans…
        </div>
      ) : cycleIds.length === 0 ? (
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
            ⬛
          </p>
          <p
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: 600,
              marginBottom: "var(--sp-3)",
            }}
          >
            No Plans Yet
          </p>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--fg-muted)",
              marginBottom: "var(--sp-6)",
            }}
          >
            Create your first plan to lock funds and automate bill payments.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreate(true)}
          >
            Create First Plan →
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
          {cycleIds.map((id) => (
            <CycleCard key={id.toString()} cycleId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
