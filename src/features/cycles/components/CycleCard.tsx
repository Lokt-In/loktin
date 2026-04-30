import { useEffect, useState } from "react";
import { useCycleDetails } from "../hooks/useCycles";
import { useBills } from "../../bills/hooks/useBills";
import Badge from "../../../shared/components/Badge";
import Card from "../../../shared/components/Card";
import Button from "../../../shared/components/Button";
import AddBillsForm from "../../bills/components/AddBillsForm";
import BillDetailsModal from "../../bills/components/BillDetailsModal";
import type { BillData } from "../../bills/hooks/useBills";

interface Props {
  cycleId: bigint;
}

function formatUsdc(stroops: bigint) {
  return (Number(stroops) / 10_000_000).toFixed(2);
}

export default function CycleCard({ cycleId }: Props) {
  const {
    data: cycle,
    loading: cycleLoading,
    reload,
  } = useCycleDetails(cycleId);
  const [showAddBills, setShowAddBills] = useState(false);
  const [showBills, setShowBills] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillData | null>(null);

  const startTs = cycle?.start_date ?? 0n;
  const endTs = cycle?.end_date ?? 0n;

  const {
    bills,
    loading: billsLoading,
    submitting,
    loadBills,
    addBills,
    skipNextOccurrence,
    deleteBillPermanently,
  } = useBills(cycleId, startTs, endTs);

  useEffect(() => {
    void reload();
  }, [cycleId]);
  useEffect(() => {
    if (showBills) void loadBills();
  }, [showBills]);

  if (cycleLoading || !cycle) {
    return (
      <Card>
        <p
          style={{ color: "var(--fg-muted)", fontSize: "var(--font-size-sm)" }}
        >
          Loading plan…
        </p>
      </Card>
    );
  }

  const deposited = Number(cycle.total_deposited) / 10_000_000;
  const fee = Number(cycle.operating_fee) / 10_000_000;
  const feeRate = Number(cycle.fee_percentage) / 100;
  const available = deposited - fee;

  const allocated = bills.reduce((sum, b) => {
    const amt = Number(b.amount) / 10_000_000;
    return (
      sum +
      (b.is_recurring
        ? amt * b.recurrence_calendar.length
        : b.is_paid
          ? 0
          : amt)
    );
  }, 0);
  const remaining = available - allocated;

  const startDate = new Date(Number(cycle.start_date) * 1000);
  const endDate = new Date(Number(cycle.end_date) * 1000);
  const now = Date.now() / 1000;
  const cycleLen = Number(cycle.end_date) - Number(cycle.start_date);
  const elapsed = Math.min(now - Number(cycle.start_date), cycleLen);
  const progress = cycleLen > 0 ? (elapsed / cycleLen) * 100 : 0;

  const dueSoon = bills.filter((b) => {
    const due = Number(b.due_date);
    const diff = due - now;
    return !b.is_paid && diff > 0 && diff < 86400;
  });

  return (
    <>
      <Card>
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "var(--sp-5)",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--fg-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "var(--sp-1)",
              }}
            >
              Plan #{cycleId.toString()}
            </p>
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--fg-secondary)",
              }}
            >
              {startDate.toLocaleDateString()} → {endDate.toLocaleDateString()}
            </p>
          </div>
          <Badge variant={cycle.is_active ? "active" : "ended"}>
            {cycle.is_active ? "Active" : "Ended"}
          </Badge>
        </div>

        {/* ── Due Soon Banner ── */}
        {dueSoon.length > 0 && (
          <div
            style={{
              background: "rgba(139, 112, 64, 0.1)",
              border: "1px solid var(--status-warning)",
              padding: "var(--sp-3) var(--sp-4)",
              marginBottom: "var(--sp-5)",
              fontSize: "var(--font-size-xs)",
            }}
          >
            <span style={{ color: "var(--status-warning)", fontWeight: 600 }}>
              ⚠ {dueSoon.length} bill{dueSoon.length > 1 ? "s" : ""} due within
              24 hours
            </span>
          </div>
        )}

        {/* ── Stats grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "var(--sp-4)",
            marginBottom: "var(--sp-5)",
          }}
        >
          {[
            { label: "Deposited", value: `${deposited.toFixed(2)} USDC` },
            { label: "Allocated", value: `${allocated.toFixed(2)} USDC` },
            {
              label: "Remaining",
              value: `${remaining.toFixed(2)} USDC`,
              highlight: remaining < 0,
            },
            {
              label: `Fee (${feeRate.toFixed(1)}%)`,
              value: `${fee.toFixed(2)} USDC`,
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                borderLeft: "2px solid var(--border)",
                paddingLeft: "var(--sp-3)",
              }}
            >
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--fg-muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "var(--sp-1)",
                }}
              >
                {s.label}
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-md)",
                  fontWeight: 600,
                  color: s.highlight
                    ? "var(--status-error)"
                    : "var(--fg-primary)",
                }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Progress bar ── */}
        <div style={{ marginBottom: "var(--sp-5)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "var(--sp-2)",
              fontSize: "var(--font-size-xs)",
              color: "var(--fg-muted)",
            }}
          >
            <span>Plan Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div
            style={{
              height: 4,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "var(--accent-primary)",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        {/* ── Actions ── */}
        {cycle.is_active && (
          <div
            style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowBills(!showBills);
              }}
            >
              {showBills
                ? "Hide Bills"
                : `Manage Bills${bills.length ? ` (${bills.length})` : ""}`}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowAddBills(!showAddBills);
                void loadBills();
              }}
            >
              + Add Bills
            </Button>
          </div>
        )}

        {/* ── Add Bills Form ── */}
        {showAddBills && cycle.is_active && (
          <div
            style={{
              marginTop: "var(--sp-6)",
              paddingTop: "var(--sp-6)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-muted)",
                marginBottom: "var(--sp-4)",
              }}
            >
              Add Bills
            </p>
            <AddBillsForm
              onSubmit={async (bills) => {
                const ok = await addBills(bills);
                if (ok) {
                  setShowAddBills(false);
                  void reload();
                }
                return ok;
              }}
              submitting={submitting}
              availableUsdc={remaining > 0 ? remaining : 0}
            />
          </div>
        )}

        {/* ── Bills List ── */}
        {showBills && (
          <div
            style={{
              marginTop: "var(--sp-6)",
              paddingTop: "var(--sp-6)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-muted)",
                marginBottom: "var(--sp-4)",
              }}
            >
              Bills
            </p>
            {billsLoading ? (
              <p
                style={{
                  color: "var(--fg-muted)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                Loading bills…
              </p>
            ) : bills.length === 0 ? (
              <p
                style={{
                  color: "var(--fg-muted)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                No bills in this plan yet.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  border: "1px solid var(--border)",
                }}
              >
                {bills.map((bill, i) => (
                  <div
                    key={bill.id.toString()}
                    onClick={() => setSelectedBill(bill)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "var(--sp-3) var(--sp-4)",
                      borderBottom:
                        i < bills.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                      cursor: "pointer",
                      fontSize: "var(--font-size-sm)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-elevated)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "")
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--sp-3)",
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{bill.name}</span>
                      <Badge
                        variant={bill.is_recurring ? "recurring" : "neutral"}
                        style={{ fontSize: 10 }}
                      >
                        {bill.is_recurring ? "Recurring" : "One-time"}
                      </Badge>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--sp-4)",
                      }}
                    >
                      <span style={{ color: "var(--fg-secondary)" }}>
                        {formatUsdc(bill.amount)} USDC
                      </span>
                      <Badge variant={bill.is_paid ? "paid" : "pending"}>
                        {bill.is_paid ? "Paid" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <BillDetailsModal
        bill={selectedBill}
        onClose={() => setSelectedBill(null)}
        onSkip={skipNextOccurrence}
        onDelete={deleteBillPermanently}
      />
    </>
  );
}
