import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import {
  upsertUser,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  type Template,
} from "../lib/supabase";
import Card from "../shared/components/Card";
import Button from "../shared/components/Button";
import Badge from "../shared/components/Badge";
import Input from "../shared/components/Input";
import Modal from "../shared/components/Modal";

const STARTER_TEMPLATES: Omit<Template, "id" | "user_id" | "created_at">[] = [
  {
    name: "Monthly Household",
    description:
      "Rent, utilities, internet — the essentials for running a home.",
    type: "cycle",
    is_public: true,
    data: {
      duration_months: 3,
      bills: [
        { name: "Rent", amount: 1200, isRecurring: true },
        { name: "Electricity", amount: 80, isRecurring: true },
        { name: "Internet", amount: 60, isRecurring: true },
        { name: "Water", amount: 40, isRecurring: true },
      ],
    },
  },
  {
    name: "Student Budget",
    description: "Subscriptions and recurring costs common for students.",
    type: "cycle",
    is_public: true,
    data: {
      duration_months: 6,
      bills: [
        { name: "Tuition Installment", amount: 500, isRecurring: true },
        { name: "Netflix", amount: 15, isRecurring: true },
        { name: "Spotify", amount: 10, isRecurring: true },
        { name: "Cloud Storage", amount: 3, isRecurring: true },
      ],
    },
  },
  {
    name: "Freelancer Essentials",
    description:
      "Business tools and variable expenses for independent workers.",
    type: "cycle",
    is_public: true,
    data: {
      duration_months: 3,
      bills: [
        { name: "SaaS Tools", amount: 50, isRecurring: true },
        { name: "Domain/Hosting", amount: 15, isRecurring: true },
        { name: "Health Insurance", amount: 200, isRecurring: true },
      ],
    },
  },
];

function TemplateCard({
  t,
  mine,
  onDelete,
}: {
  t: Template | Omit<Template, "id" | "user_id" | "created_at">;
  mine: boolean;
  onDelete?: () => void;
}) {
  const bills =
    (t.data.bills as {
      name: string;
      amount: number;
      isRecurring: boolean;
    }[]) ?? [];
  const total = bills.reduce((s, b) => s + b.amount, 0);

  return (
    <Card
      hoverable
      style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1, marginRight: "var(--sp-3)" }}>
          <p style={{ fontWeight: 600, marginBottom: "var(--sp-1)" }}>
            {t.name}
          </p>
          {t.description && (
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--fg-muted)",
                lineHeight: 1.5,
              }}
            >
              {t.description}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)", flexShrink: 0 }}>
          <Badge variant={t.type === "cycle" ? "accent" : "recurring"}>
            {t.type === "cycle" ? "plan" : t.type}
          </Badge>
          {t.is_public && <Badge variant="neutral">Public</Badge>}
        </div>
      </div>

      {bills.length > 0 && (
        <div
          style={{ fontSize: "var(--font-size-xs)", color: "var(--fg-muted)" }}
        >
          {bills.slice(0, 3).map((b, i) => (
            <span key={i}>
              {b.name}
              {i < Math.min(bills.length, 3) - 1 ? " · " : ""}
            </span>
          ))}
          {bills.length > 3 && <span> +{bills.length - 3} more</span>}
          {" · "}
          <span style={{ color: "var(--fg-primary)", fontWeight: 600 }}>
            {total} USDC/mo est.
          </span>
        </div>
      )}

      {mine && onDelete && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "var(--sp-3)",
          }}
        >
          <Button variant="danger" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function Templates() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSave, setShowSave] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"mine" | "community">("community");

  const supabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    if (!address) {
      void navigate("/");
      return;
    }
    void (async () => {
      const u = await upsertUser(address);
      if (u) {
        setUserId(u.id);
        const t = await getTemplates(u.id);
        setTemplates(t);
      }
      setLoading(false);
    })();
  }, [address]);

  const handleSave = async () => {
    if (!userId || !newName.trim()) return;
    setSaving(true);
    const saved = await saveTemplate({
      user_id: userId,
      name: newName.trim(),
      description: newDesc.trim() || null,
      type: "cycle",
      data: { bills: [] },
      is_public: false,
    });
    if (saved) {
      setTemplates((prev) => [saved, ...prev]);
      setShowSave(false);
      setNewName("");
      setNewDesc("");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const ok = await deleteTemplate(id);
    if (ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const myTemplates = userId
    ? templates.filter((t) => t.user_id === userId)
    : [];
  const communityTemplates = templates.filter(
    (t) => t.is_public && (!userId || t.user_id !== userId),
  );

  return (
    <div className="container" style={{ padding: "var(--sp-10) var(--sp-6)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "var(--sp-8)",
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
            Templates
          </h1>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--fg-muted)",
            }}
          >
            Pre-built and community plan templates
          </p>
        </div>
        {supabaseConfigured && (
          <Button variant="primary" size="md" onClick={() => setShowSave(true)}>
            + Save Template
          </Button>
        )}
      </div>

      {!supabaseConfigured && (
        <div
          style={{
            border: "1px solid var(--status-warning)",
            padding: "var(--sp-4)",
            marginBottom: "var(--sp-6)",
            fontSize: "var(--font-size-sm)",
            color: "var(--status-warning)",
          }}
        >
          ⚠ Supabase not configured — configure VITE_SUPABASE_URL and
          VITE_SUPABASE_ANON_KEY to save and load custom templates.
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: "var(--sp-8)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {(["community", "mine"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "var(--sp-3) var(--sp-5)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-sm)",
              color: tab === t ? "var(--fg-primary)" : "var(--fg-muted)",
              borderBottom:
                tab === t
                  ? "2px solid var(--accent-primary)"
                  : "2px solid transparent",
              marginBottom: -1,
              letterSpacing: "0.04em",
            }}
          >
            {t === "community"
              ? "Community"
              : `My Templates${myTemplates.length ? ` (${myTemplates.length})` : ""}`}
          </button>
        ))}
      </div>

      {loading ? (
        <p
          style={{ color: "var(--fg-muted)", fontSize: "var(--font-size-sm)" }}
        >
          Loading templates…
        </p>
      ) : tab === "community" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "var(--sp-4)",
          }}
        >
          {STARTER_TEMPLATES.map((t) => (
            <TemplateCard key={t.name} t={t as Template} mine={false} />
          ))}
          {communityTemplates.map((t) => (
            <TemplateCard key={t.id} t={t} mine={false} />
          ))}
        </div>
      ) : myTemplates.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "var(--sp-16)",
            border: "1px dashed var(--border)",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: 600,
              marginBottom: "var(--sp-3)",
            }}
          >
            No templates saved
          </p>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--fg-muted)",
              marginBottom: "var(--sp-6)",
            }}
          >
            Save a plan setup as a template to reuse it later.
          </p>
          {supabaseConfigured && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowSave(true)}
            >
              Save First Template
            </Button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "var(--sp-4)",
          }}
        >
          {myTemplates.map((t) => (
            <TemplateCard
              key={t.id}
              t={t}
              mine
              onDelete={() => void handleDelete(t.id)}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={showSave}
        onClose={() => setShowSave(false)}
        title="Save Template"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--sp-4)",
          }}
        >
          <Input
            label="Template Name"
            placeholder="e.g. My Household Budget"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            label="Description (optional)"
            placeholder="Brief description…"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div style={{ display: "flex", gap: "var(--sp-3)" }}>
            <Button
              variant="primary"
              size="md"
              onClick={() => void handleSave()}
              isLoading={saving}
              disabled={!newName.trim()}
            >
              Save Template
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setShowSave(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
