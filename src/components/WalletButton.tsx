import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { connectWallet, disconnectWallet } from "../util/wallet";
import { requestFriendbotFunds } from "../util/friendbot";
import { stellarNetwork } from "../contracts/util";
import Button from "../shared/components/Button";
import Modal from "../shared/components/Modal";

export const WalletButton = () => {
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const { address, isPending } = useWallet();
  const { xlm, isLoading, isFunded, updateBalance } = useWalletBalance();

  const handleFund = async () => {
    if (!address) return;
    setFunding(true);
    setFundError(null);
    try {
      await requestFriendbotFunds(address);
      await updateBalance();
    } catch (e) {
      setFundError(e instanceof Error ? e.message : String(e));
    } finally {
      setFunding(false);
    }
  };

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "";

  if (!address) {
    return (
      <Button
        variant="primary"
        size="md"
        onClick={() => void connectWallet()}
        isLoading={isPending}
      >
        {isPending ? "Connecting…" : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <>
      <div
        style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}
      >
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--fg-muted)",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {xlm ? `${xlm} XLM` : "—"}
        </span>
        <button
          onClick={() => setShowDisconnect(true)}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--fg-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-size-xs)",
            padding: "var(--sp-2) var(--sp-3)",
            cursor: "pointer",
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-2)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--status-success)",
              display: "inline-block",
            }}
          />
          {shortAddr}
        </button>
      </div>

      <Modal
        isOpen={showDisconnect}
        onClose={() => setShowDisconnect(false)}
        title="Wallet Connected"
      >
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--fg-secondary)",
            marginBottom: "var(--sp-4)",
            wordBreak: "break-all",
          }}
        >
          {address}
        </p>

        {stellarNetwork !== "PUBLIC" && (
          <div
            style={{
              border: "1px solid var(--border)",
              padding: "var(--sp-3)",
              marginBottom: "var(--sp-4)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--sp-2)",
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
                Test XLM (gas)
              </span>
              <span
                style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}
              >
                {isLoading ? "…" : xlm !== "-" ? `${xlm} XLM` : "—"}
              </span>
            </div>
            {!isFunded && (
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--fg-muted)",
                  marginBottom: "var(--sp-2)",
                  lineHeight: 1.5,
                }}
              >
                This account isn&apos;t funded yet. Get free test XLM to pay
                network fees before saving.
              </p>
            )}
            {fundError && (
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--status-error)",
                  marginBottom: "var(--sp-2)",
                }}
              >
                {fundError}
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleFund()}
              isLoading={funding}
            >
              Get test XLM →
            </Button>
          </div>
        )}

        <div style={{ display: "flex", gap: "var(--sp-3)" }}>
          <Button
            variant="danger"
            size="md"
            onClick={() =>
              void disconnectWallet().then(() => setShowDisconnect(false))
            }
          >
            Disconnect
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setShowDisconnect(false)}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default WalletButton;
