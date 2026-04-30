import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import {
  updateUser,
  upsertUser,
  getNotificationPrefs,
  upsertNotificationPrefs,
  type SupabaseUser,
  type NotificationPrefs,
} from "../lib/supabase";
import { disconnectWallet } from "../util/wallet";
import Card from "../shared/components/Card";
import Button from "../shared/components/Button";
import Input from "../shared/components/Input";
import Badge from "../shared/components/Badge";

export default function Profile() {
  const { address, network, networkPassphrase } = useWallet();
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    bill_due_alerts: true,
    payment_confirmations: true,
    cycle_end_warnings: true,
  });
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const shortAddr = address
    ? `${address.slice(0, 8)}…${address.slice(-6)}`
    : "";

  useEffect(() => {
    if (!address) {
      void navigate("/");
      return;
    }
    void (async () => {
      const u = await upsertUser(address);
      if (u) {
        setUser(u);
        setUsername(u.username ?? "");
      }
      if (u) {
        const p = await getNotificationPrefs(u.id);
        setPrefs(p);
      }
    })();
  }, [address]);

  const handleSave = async () => {
    if (!address) return;
    setSaving(true);
    try {
      const updated = await updateUser(address, { username: username || null });
      if (updated) {
        setUser(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
      if (user) await upsertNotificationPrefs(user.id, prefs);
    } finally {
      setSaving(false);
    }
  };

  const supbaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  return (
    <div
      className="container"
      style={{ padding: "var(--sp-10) var(--sp-6)", maxWidth: 800 }}
    >
      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          fontWeight: 700,
          marginBottom: "var(--sp-8)",
        }}
      >
        Profile
      </h1>

      {!supbaseConfigured && (
        <div
          style={{
            border: "1px solid var(--status-warning)",
            padding: "var(--sp-4)",
            marginBottom: "var(--sp-6)",
            fontSize: "var(--font-size-sm)",
            color: "var(--status-warning)",
          }}
        >
          ⚠ Supabase not configured — set VITE_SUPABASE_URL and
          VITE_SUPABASE_ANON_KEY in .env to enable profile persistence.
        </div>
      )}

      <div
        style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}
      >
        {/* Wallet Panel */}
        <Card>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--fg-muted)",
              marginBottom: "var(--sp-5)",
            }}
          >
            Wallet
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--sp-4)",
            }}
          >
            {[
              { label: "Address", value: address ?? "—", mono: true },
              { label: "Network", value: network ?? "—" },
              {
                label: "Passphrase",
                value: networkPassphrase ?? "—",
                mono: true,
                truncate: true,
              },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--sp-3) 0",
                  borderBottom: "1px solid var(--border)",
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
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontFamily: row.mono ? "var(--font-mono)" : undefined,
                    maxWidth: "60%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--fg-secondary)",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "var(--sp-5)",
              display: "flex",
              gap: "var(--sp-3)",
            }}
          >
            <a
              href={`https://stellar.expert/explorer/testnet/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm">
                View on Explorer ↗
              </Button>
            </a>
            <Button
              variant="danger"
              size="sm"
              onClick={() => void disconnectWallet().then(() => navigate("/"))}
            >
              Disconnect
            </Button>
          </div>
        </Card>

        {/* Identity Panel */}
        <Card>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--fg-muted)",
              marginBottom: "var(--sp-5)",
            }}
          >
            Identity
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--sp-4)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--sp-4)",
                marginBottom: "var(--sp-2)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--font-size-xl)",
                  fontWeight: 700,
                  color: "var(--accent-primary)",
                }}
              >
                {username ? username[0].toUpperCase() : shortAddr.slice(0, 2)}
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>{username || "Unnamed"}</p>
                <p
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--fg-muted)",
                  }}
                >
                  {shortAddr}
                </p>
              </div>
              {user?.is_admin && <Badge variant="accent">Admin</Badge>}
            </div>
            <Input
              label="Display Name"
              placeholder="Enter a username…"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              // hint="Stored in Supabase, linked to your wallet"
            />
          </div>
        </Card>

        {/* Notification Prefs */}
        <Card>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--fg-muted)",
              marginBottom: "var(--sp-5)",
            }}
          >
            Notifications
          </p>
          {(
            [
              {
                key: "bill_due_alerts",
                label: "Bill Due Alerts",
                desc: "Notify when a bill is due within 24 hours",
              },
              {
                key: "payment_confirmations",
                label: "Payment Confirmations",
                desc: "Notify when a bill payment is processed",
              },
              {
                key: "cycle_end_warnings",
                label: "Plan End Warnings",
                desc: "Notify 3 days before a plan ends",
              },
            ] as const
          ).map((item) => (
            <label
              key={item.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--sp-4) 0",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 500,
                    marginBottom: 2,
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--fg-muted)",
                  }}
                >
                  {item.desc}
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs[item.key]}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, [item.key]: e.target.checked }))
                }
                style={{
                  accentColor: "var(--accent-primary)",
                  width: 16,
                  height: 16,
                }}
              />
            </label>
          ))}
        </Card>

        {/* Admin Panel — only if is_admin */}
        {user?.is_admin && (
          <Card style={{ borderColor: "var(--accent-secondary)" }}>
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--accent-secondary)",
                marginBottom: "var(--sp-5)",
              }}
            >
              Admin Controls
            </p>
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--fg-secondary)",
                marginBottom: "var(--sp-4)",
              }}
            >
              You have admin access to this contract. Admin functions (force-pay
              bills, end plans early) are available via direct contract
              invocation.
            </p>
            <a
              href={`https://stellar.expert/explorer/testnet/contract/CBCKKGNNNFSMTE2IPVGA5YUHSTIN4XX5MQ7LZN4MCPHAKATHWZODGXJN`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm">
                View Contract ↗
              </Button>
            </a>
          </Card>
        )}

        <Button
          variant="primary"
          size="md"
          onClick={() => void handleSave()}
          isLoading={saving}
          style={{ alignSelf: "flex-start" }}
        >
          {saved ? "✓ Saved" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
