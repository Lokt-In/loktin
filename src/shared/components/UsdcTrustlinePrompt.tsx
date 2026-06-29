import { useUsdcTrustline } from "../../hooks/useUsdcTrustline";
import { USDC_FAUCET_URL } from "../../lib/usdc";
import Button from "./Button";

/**
 * Onboarding prompt: if the connected wallet is missing a USDC trustline, show
 * a one-time "Add USDC trustline" action plus a faucet link. Renders nothing
 * once the trustline exists. Kept deliberately plain pending the redesign.
 */
export default function UsdcTrustlinePrompt() {
  const { hasTrustline, submitting, error, addTrustline } = useUsdcTrustline();

  // Only surface once we know a trustline is missing.
  if (hasTrustline !== false) return null;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        padding: "var(--sp-4)",
        margin: "var(--sp-6) var(--sp-6) 0",
      }}
    >
      <p
        style={{ fontSize: "var(--font-size-sm)", marginBottom: "var(--sp-3)" }}
      >
        Your wallet can&apos;t hold USDC yet. Add a one-time USDC trustline,
        then get test USDC from the faucet. (Needs a funded account — use
        &ldquo;Get test XLM&rdquo; in the wallet menu first.)
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
            color: "var(--accent-primary)",
          }}
        >
          Get test USDC →
        </a>
      </div>
    </div>
  );
}
