import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import {
  useSpendSave,
  SPEND_SAVE_CONTRACT_ID,
} from "../../features/spend_save/hooks/useSpendSave";
import { useUsdcBalance } from "../../hooks/useUsdcBalance";
import UsdcAllowance from "../../shared/components/UsdcAllowance";
import Card from "../../shared/components/Card";
import Button from "../../shared/components/Button";
import Input from "../../shared/components/Input";
import Modal from "../../shared/components/Modal";

const WITHDRAWAL_DAY = 28;

function daysUntilNext28th(currentDay: number): number {
  if (currentDay === WITHDRAWAL_DAY) return 0;
  if (currentDay < WITHDRAWAL_DAY) return WITHDRAWAL_DAY - currentDay;
  // past the 28th — next one is in next month, ~28-31 days away
  return WITHDRAWAL_DAY + 30 - currentDay;
}

export default function SpendSave() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const {
    position,
    submitting,
    lastError,
    currentDay,
    enroll,
    spend,
    withdraw,
  } = useSpendSave();
  const { formatted: usdcFormatted, refresh: refreshBalance } =
    useUsdcBalance();

  // Local state
  const [percentInput, setPercentInput] = useState(10);
  const [showSpend, setShowSpend] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pendingSpend, setPendingSpend] = useState<{
    recipient: string;
    amount: bigint;
  } | null>(null);

  useEffect(() => {
    if (!address) void navigate("/");
  }, [address]);
  if (!address) return null;

  const isWithdrawalDay = currentDay === WITHDRAWAL_DAY;
  const daysToNext = daysUntilNext28th(currentDay);

  const savePct = position ? position.save_percentage / 100 : percentInput;
  const savedBalance = position
    ? Number(position.saved_balance) / 10_000_000
    : 0;
  const lifetimeSaved = position
    ? Number(position.total_saved_lifetime) / 10_000_000
    : 0;
  const lifetimeSpent = position
    ? Number(position.total_spent_lifetime) / 10_000_000
    : 0;

  const spendNum = parseFloat(spendAmount) || 0;
  const previewSaved = spendNum * (savePct / 100);
  const previewSent = spendNum - previewSaved;

  const handleEnroll = async () => {
    const bps = Math.round(percentInput * 100);
    if (bps < 100 || bps > 5000) {
      alert("Save percentage must be between 1% and 50%.");
      return;
    }
    const ok = await enroll(bps);
    if (ok) alert(`Enrolled at ${percentInput}% save rate.`);
  };

  const startSpend = () => {
    if (!recipient.trim() || spendNum <= 0) {
      alert("Enter recipient and amount.");
      return;
    }
    if (!recipient.startsWith("G") || recipient.length !== 56) {
      alert("Invalid Stellar address.");
      return;
    }
    setPendingSpend({
      recipient: recipient.trim(),
      amount: BigInt(Math.floor(spendNum * 10_000_000)),
    });
  };

  const finishSpend = async () => {
    if (!pendingSpend) return;
    const result = await spend(pendingSpend.recipient, pendingSpend.amount);
    setPendingSpend(null);
    if (result) {
      setShowSpend(false);
      setRecipient("");
      setSpendAmount("");
      void refreshBalance();
      alert(
        `Sent ${(Number(result.sent) / 10_000_000).toFixed(2)} USDC to recipient. Saved ${(Number(result.saved) / 10_000_000).toFixed(2)} USDC.`,
      );
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) return;
    if (amt > savedBalance) {
      alert("Insufficient saved balance.");
      return;
    }
    const ok = await withdraw(BigInt(Math.floor(amt * 10_000_000)));
    if (ok) {
      setShowWithdraw(false);
      setWithdrawAmount("");
      void refreshBalance();
      alert(`Withdrew ${amt.toFixed(2)} USDC.`);
    }
  };

  return (
    <div style={{ padding: "var(--sp-8) var(--sp-6)", maxWidth: 960 }}>
      <div style={{ marginBottom: "var(--sp-6)" }}>
        <h1
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: 700,
            marginBottom: "var(--sp-2)",
          }}
        >
          Spend &amp; Save
        </h1>
        <p
          style={{ fontSize: "var(--font-size-sm)", color: "var(--fg-muted)" }}
        >
          Auto-route a configured % of every spend into a vault. Withdrawals
          only on the 28th UTC.
        </p>
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

      {!position ? (
        <Card>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "var(--sp-3)",
            }}
          >
            Get Started
          </p>
          <p
            style={{
              fontSize: "var(--font-size-md)",
              fontWeight: 600,
              marginBottom: "var(--sp-3)",
            }}
          >
            Set your auto-save percentage
          </p>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--fg-secondary)",
              marginBottom: "var(--sp-5)",
              lineHeight: 1.6,
            }}
          >
            Pick how much of each spend automatically goes into your locked
            savings vault. Withdrawals are only allowed on the 28th of each
            month — discipline by design.
          </p>

          <div style={{ marginBottom: "var(--sp-5)" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "var(--sp-3)",
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
                Save Rate
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: 700,
                  color: "var(--accent-primary)",
                }}
              >
                {percentInput}%
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={percentInput}
              onChange={(e) => setPercentInput(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent-primary)" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "var(--font-size-xs)",
                color: "var(--fg-muted)",
                marginTop: "var(--sp-1)",
              }}
            >
              <span>1%</span>
              <span>50%</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => void handleEnroll()}
            isLoading={submitting}
          >
            Enroll at {percentInput}% →
          </Button>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
              border: "1px solid var(--border)",
              marginBottom: "var(--sp-6)",
            }}
          >
            {[
              {
                label: "Saved Balance",
                value: `${savedBalance.toFixed(2)} USDC`,
                accent: true,
              },
              { label: "Save Rate", value: `${savePct.toFixed(1)}%` },
              { label: "Lifetime Saved", value: `${lifetimeSaved.toFixed(2)}` },
              { label: "Lifetime Spent", value: `${lifetimeSpent.toFixed(2)}` },
            ].map((s, i) => (
              <div
                key={s.label}
                style={{
                  padding: "var(--sp-4)",
                  borderRight: i < 3 ? "1px solid var(--border)" : "none",
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
                    color: s.accent
                      ? "var(--accent-primary)"
                      : "var(--fg-primary)",
                  }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Day-28 banner */}
          <div
            style={{
              padding: "var(--sp-4) var(--sp-5)",
              border: `1px solid ${isWithdrawalDay ? "var(--status-success)" : "var(--border)"}`,
              background: isWithdrawalDay
                ? "rgba(61, 139, 110, 0.1)"
                : "var(--bg-surface)",
              marginBottom: "var(--sp-6)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
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
                Withdrawal Window
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-md)",
                  fontWeight: 600,
                  color: isWithdrawalDay
                    ? "var(--status-success)"
                    : "var(--fg-primary)",
                }}
              >
                {isWithdrawalDay
                  ? "✓ Open today"
                  : `Opens in ${daysToNext} day${daysToNext !== 1 ? "s" : ""}`}
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--fg-muted)",
                  marginTop: "var(--sp-1)",
                }}
              >
                Today is the {currentDay}
                {currentDay === 1
                  ? "st"
                  : currentDay === 2
                    ? "nd"
                    : currentDay === 3
                      ? "rd"
                      : "th"}{" "}
                (UTC). Withdrawals open only on the 28th.
              </p>
            </div>
            <Button
              variant={isWithdrawalDay ? "primary" : "muted"}
              size="md"
              onClick={() => setShowWithdraw(true)}
              disabled={!isWithdrawalDay || savedBalance <= 0}
            >
              Withdraw
            </Button>
          </div>

          {/* Quick actions */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--sp-4)",
              marginBottom: "var(--sp-6)",
            }}
          >
            <Card hoverable onClick={() => setShowSpend(true)}>
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--fg-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "var(--sp-2)",
                }}
              >
                Action
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-md)",
                  fontWeight: 600,
                  marginBottom: "var(--sp-2)",
                }}
              >
                Spend with auto-save
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--fg-muted)",
                }}
              >
                Send USDC. {savePct.toFixed(1)}% routes to your vault.
              </p>
            </Card>
            <Card
              hoverable
              onClick={() => void enroll(Math.round(savePct * 100))}
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
                Settings
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-md)",
                  fontWeight: 600,
                  marginBottom: "var(--sp-2)",
                }}
              >
                Save rate: {savePct.toFixed(1)}%
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--fg-muted)",
                }}
              >
                Click to adjust your save percentage.
              </p>
            </Card>
          </div>

          <div
            style={{
              padding: "var(--sp-3) var(--sp-4)",
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--fg-muted)",
              }}
            >
              Wallet:
            </span>
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}>
              {usdcFormatted} USDC
            </span>
          </div>
        </>
      )}

      {/* Spend Modal */}
      <Modal
        isOpen={showSpend}
        onClose={() => {
          setShowSpend(false);
          setPendingSpend(null);
        }}
        title="Spend with Auto-Save"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--sp-4)",
          }}
        >
          {!pendingSpend ? (
            <>
              <Input
                label="Recipient Stellar Address"
                placeholder="G..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
              <Input
                label="Total Amount (USDC)"
                type="number"
                step="0.01"
                min="0.01"
                value={spendAmount}
                onChange={(e) => setSpendAmount(e.target.value)}
              />
              {spendNum > 0 && (
                <div
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    padding: "var(--sp-3)",
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
                    Breakdown
                  </p>
                  {[
                    {
                      label: "Sent to recipient",
                      value: `${previewSent.toFixed(2)} USDC`,
                    },
                    {
                      label: "Saved to vault",
                      value: `${previewSaved.toFixed(2)} USDC`,
                      accent: true,
                    },
                    {
                      label: "Total debited",
                      value: `${spendNum.toFixed(2)} USDC`,
                    },
                  ].map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "var(--font-size-sm)",
                        padding: "var(--sp-1) 0",
                      }}
                    >
                      <span style={{ color: "var(--fg-muted)" }}>
                        {r.label}
                      </span>
                      <span
                        style={{
                          color: r.accent
                            ? "var(--accent-primary)"
                            : "var(--fg-primary)",
                          fontWeight: r.accent ? 600 : 400,
                        }}
                      >
                        {r.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <Button
                  variant="primary"
                  size="md"
                  onClick={startSpend}
                  disabled={!recipient || spendNum <= 0}
                >
                  Continue →
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setShowSpend(false)}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div>
              <UsdcAllowance
                spenderContract={SPEND_SAVE_CONTRACT_ID}
                requiredAmount={pendingSpend.amount}
                onReady={() => void finishSpend()}
                label="Authorize the Spend & Save contract to debit your USDC."
              />
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--fg-muted)",
                }}
              >
                {submitting ? "Sending…" : "Approve allowance to continue."}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        title="Withdraw from Vault"
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
            Available: <strong>{savedBalance.toFixed(2)} USDC</strong>
          </p>
          <Input
            label="Amount to Withdraw (USDC)"
            type="number"
            step="0.01"
            min="0.01"
            max={savedBalance.toFixed(2)}
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />
          <div style={{ display: "flex", gap: "var(--sp-3)" }}>
            <Button
              variant="primary"
              size="md"
              onClick={() => void handleWithdraw()}
              isLoading={submitting}
              disabled={!withdrawAmount}
            >
              Withdraw
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setShowWithdraw(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
