import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { connectWallet, disconnectWallet } from "../util/wallet";
import Button from "../shared/components/Button";
import Modal from "../shared/components/Modal";

export const WalletButton = () => {
  const [showDisconnect, setShowDisconnect] = useState(false);
  const { address, isPending } = useWallet();
  const { xlm, isLoading } = useWalletBalance();

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
