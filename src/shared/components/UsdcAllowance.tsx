import { useEffect } from "react";
import { useUsdcAllowance } from "../../hooks/useUsdcAllowance";
import Button from "./Button";

/**
 * Reusable allowance prompt: ensures the connected wallet has approved
 * `spenderContract` to transfer at least `requiredAmount` of USDC.
 *
 * If allowance is insufficient, shows an "Approve" button that signs
 * an `approve` call on the USDC token contract.
 */
interface Props {
  spenderContract: string;
  requiredAmount: bigint; // raw stroops
  endDate?: bigint; // goal end (unix seconds); allowance expires then, capped at the network max
  onReady: () => void; // called when allowance is sufficient
  label?: string; // override prompt label
}

export default function UsdcAllowance({
  spenderContract,
  requiredAmount,
  endDate,
  onReady,
  label,
}: Props) {
  const { sufficient, loading, approving, error, approve } = useUsdcAllowance({
    spenderContract,
    requiredAmount,
    endDate,
  });

  useEffect(() => {
    if (sufficient) onReady();
  }, [sufficient, onReady]);

  if (loading) {
    return (
      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--fg-muted)" }}>
        Checking allowance…
      </p>
    );
  }
  if (sufficient) {
    return null; // sufficient, no UI needed
  }
  return (
    <div
      style={{
        border: "1px solid var(--border-accent)",
        padding: "var(--sp-4)",
        marginBottom: "var(--sp-4)",
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
        One-time approval needed
      </p>
      <p
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--fg-secondary)",
          marginBottom: "var(--sp-3)",
        }}
      >
        {label ??
          `Authorize this contract to debit USDC from your wallet for periodic deposits.`}
      </p>
      {error && (
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--status-error)",
            marginBottom: "var(--sp-2)",
          }}
        >
          {error}
        </p>
      )}
      <Button
        variant="primary"
        size="sm"
        onClick={() => void approve()}
        isLoading={approving}
      >
        Approve {(Number(requiredAmount) / 10_000_000).toFixed(2)} USDC →
      </Button>
    </div>
  );
}
