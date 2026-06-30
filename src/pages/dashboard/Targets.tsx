import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import {
  useTargets,
  TARGET_SAVINGS_CONTRACT_ID,
} from "../../features/targets/hooks/useTargets";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";
import TargetCard from "../../features/targets/components/TargetCard";
import CreateTargetForm from "../../features/targets/components/CreateTargetForm";
import UsdcAllowance from "../../shared/components/UsdcAllowance";
import Button from "../../shared/components/Button";

export default function Targets() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const {
    goals,
    loading,
    submitting,
    lastError,
    loadGoals,
    createTarget,
    manualDeposit,
    withdraw,
  } = useTargets();
  const { formatted: usdcFormatted, refresh: refreshBalance } =
    useUsdcBalance();
  const [showCreate, setShowCreate] = useState(false);
  const [pendingCreate, setPendingCreate] = useState<{
    name: string;
    targetAmount: bigint;
    periodSeconds: bigint;
    periodAmount: bigint;
    endDate: bigint;
  } | null>(null);

  useEffect(() => {
    if (!address) {
      void navigate("/");
      return;
    }
    void loadGoals();
  }, [address]);

  if (!address) return null;

  const submit = (
    name: string,
    targetAmount: bigint,
    periodSeconds: bigint,
    periodAmount: bigint,
    endDate: bigint,
  ) => {
    setPendingCreate({
      name,
      targetAmount,
      periodSeconds,
      periodAmount,
      endDate,
    });
  };

  const finishCreate = async () => {
    if (!pendingCreate) return;
    const { name, targetAmount, periodSeconds, periodAmount, endDate } =
      pendingCreate;
    const id = await createTarget(
      name,
      targetAmount,
      periodSeconds,
      periodAmount,
      endDate,
    );
    setPendingCreate(null);
    if (id !== null) {
      setShowCreate(false);
      void refreshBalance();
      alert(`Goal #${id} created. Keeper will start debiting on schedule.`);
    }
  };

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
            Target Savings
          </h1>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--fg-muted)",
            }}
          >
            {goals.length} goal{goals.length !== 1 ? "s" : ""} · 1% forfeit on
            early withdrawal
          </p>
        </div>
        <Button
          variant={showCreate ? "ghost" : "primary"}
          size="md"
          onClick={() => {
            setShowCreate(!showCreate);
            setPendingCreate(null);
          }}
        >
          {showCreate ? "← Cancel" : "+ New Goal"}
        </Button>
      </div>

      <div
        style={{
          padding: "var(--sp-3) var(--sp-4)",
          border: "1px solid var(--border)",
          marginBottom: "var(--sp-6)",
          background: "var(--bg-surface)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{ fontSize: "var(--font-size-xs)", color: "var(--fg-muted)" }}
        >
          Wallet:
        </span>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}>
          {usdcFormatted} USDC
        </span>
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
            New Savings Goal
          </p>

          {!pendingCreate && (
            <CreateTargetForm onCreate={submit} loading={submitting} />
          )}

          {pendingCreate && (
            <div>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  marginBottom: "var(--sp-4)",
                }}
              >
                Goal: <strong>{pendingCreate.name}</strong>
              </p>
              <UsdcAllowance
                spenderContract={TARGET_SAVINGS_CONTRACT_ID}
                requiredAmount={pendingCreate.targetAmount}
                endDate={pendingCreate.endDate}
                onReady={() => void finishCreate()}
                label="Authorize the Target Savings contract to debit your wallet for periodic deposits."
              />
              {/* If allowance was already sufficient, UsdcAllowance auto-fires onReady; otherwise the user clicks Approve, which triggers onReady when done. */}
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--fg-muted)",
                }}
              >
                Submitting goal…
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
          Loading goals…
        </div>
      ) : goals.length === 0 ? (
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
          ></p>
          <p
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: 600,
              marginBottom: "var(--sp-3)",
            }}
          >
            No Goals Yet
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
            Set a savings target with periodic deposits. Funds are locked until
            your end date — early withdrawals forfeit 1%.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreate(true)}
          >
            Create First Goal →
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
          {goals.map((g) => (
            <TargetCard
              key={g.id.toString()}
              goal={g}
              onManualDeposit={manualDeposit}
              onWithdraw={withdraw}
            />
          ))}
        </div>
      )}
    </div>
  );
}
