import { useUsdcTrustline } from "../../hooks/useUsdcTrustline";
import { USDC_FAUCET_URL } from "../../lib/usdc";
import Button from "./Button";

/**
 * Onboarding prompt: if the connected wallet is missing a USDC trustline, show
 * a one-time "Add USDC trustline" action plus a link to the faucet. Renders
 * nothing once the trustline exists (or before we know).
 */
export default function UsdcTrustlinePrompt() {
  const { hasTrustline, submitting, error, addTrustline } = useUsdcTrustline();

  // Only surface the prompt once we know a trustline is missing.
  if (hasTrustline !== false) return null;

  return (
    <div
      style={{
        border: "1px solid var(--border-accent)",
        borderLeft: "4px solid var(--accent-primary)",
        padding: "var(--sp-4)",
        margin: "var(--sp-6) var(--sp-6) 0",
        background: "var(--bg-surface)",
      }}
    >
      <p
        style={{
          fontSize: "var(--font-size-xs)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--fg-muted)",
          marginBottom: "var(--sp-2)",
        }}
      >
        Set up USDC
      </p>
      <p
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--fg-secondary)",
          marginBottom: "var(--sp-3)",
          lineHeight: 1.5,
        }}
      >
        Your wallet can&apos;t hold USDC yet. Add a one-time USDC trustline,
        then grab test USDC from the faucet before saving. (Requires a funded
        account — get test XLM from the wallet menu first.)
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
      <div
        style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center" }}
      >
        <Button
          variant="primary"
          size="sm"
          onClick={() => void addTrustline()}
          isLoading={submitting}
        >
          Add USDC trustline
        </Button>
        <a
          href={USDC_FAUCET_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--fg-accent, var(--accent-primary))",
            textDecoration: "underline",
          }}
        >
          Get test USDC →
        </a>
      </div>
    </div>
  );
}
