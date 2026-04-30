import { BillData } from "../hooks/useBills";
import Modal from "../../../shared/components/Modal";
import Badge from "../../../shared/components/Badge";
import Button from "../../../shared/components/Button";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface Props {
  bill: BillData | null;
  onClose: () => void;
  onSkip: (id: bigint) => Promise<boolean>;
  onDelete: (id: bigint) => Promise<boolean>;
}

export default function BillDetailsModal({
  bill,
  onClose,
  onSkip,
  onDelete,
}: Props) {
  if (!bill) return null;

  const amount = (Number(bill.amount) / 10_000_000).toFixed(2);
  const dueDate = new Date(Number(bill.due_date) * 1000);

  const handleSkip = async () => {
    if (
      !confirm(
        bill.is_recurring
          ? "Skip the next occurrence of this recurring bill? (1 adjustment per month limit)"
          : "Delete this one-time bill? (1 adjustment per month limit)",
      )
    )
      return;
    const ok = await onSkip(bill.id);
    if (ok) onClose();
    else alert("Failed. You may have already made an adjustment this month.");
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Permanently delete this bill and ALL future occurrences? This cannot be undone.",
      )
    )
      return;
    const ok = await onDelete(bill.id);
    if (ok) onClose();
    else alert("Failed. You may have already made an adjustment this month.");
  };

  return (
    <Modal isOpen={!!bill} onClose={onClose} title="Bill Details" width="480px">
      <div
        style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}
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
            Name
          </p>
          <p style={{ fontSize: "var(--font-size-lg)", fontWeight: 600 }}>
            {bill.name}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--sp-4)",
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
              Amount
            </p>
            <p style={{ fontSize: "var(--font-size-xl)", fontWeight: 700 }}>
              {amount}{" "}
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--fg-muted)",
                }}
              >
                USDC
              </span>
            </p>
          </div>
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
              Due Date
            </p>
            <p style={{ fontWeight: 600 }}>{dueDate.toLocaleDateString()}</p>
          </div>
        </div>

        <div>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "var(--sp-2)",
            }}
          >
            Type & Status
          </p>
          <div
            style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}
          >
            <Badge variant={bill.is_recurring ? "recurring" : "neutral"}>
              {bill.is_recurring ? "Recurring" : "One-Time"}
            </Badge>
            <Badge variant={bill.is_paid ? "paid" : "pending"}>
              {bill.is_paid ? "Paid" : "Pending"}
            </Badge>
          </div>
        </div>

        {bill.is_recurring && bill.recurrence_calendar.length > 0 && (
          <div>
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--fg-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "var(--sp-2)",
              }}
            >
              Recurrence Months
            </p>
            <div
              style={{ display: "flex", gap: "var(--sp-1)", flexWrap: "wrap" }}
            >
              {bill.recurrence_calendar.map((m) => (
                <span
                  key={m}
                  style={{
                    padding: "2px var(--sp-2)",
                    border: "1px solid var(--border-accent)",
                    fontSize: "var(--font-size-xs)",
                    color: "var(--accent-primary)",
                  }}
                >
                  {MONTHS[m - 1]}
                </span>
              ))}
            </div>
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--fg-muted)",
                marginTop: "var(--sp-2)",
              }}
            >
              {bill.recurrence_calendar.length} payment
              {bill.recurrence_calendar.length !== 1 ? "s" : ""} scheduled
            </p>
          </div>
        )}

        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "var(--sp-4)",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--fg-muted)",
              marginBottom: "var(--sp-3)",
            }}
          >
            Note: 1 adjustment allowed per plan per month.
          </p>
          {!bill.is_paid && (
            <div
              style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}
            >
              {bill.is_recurring ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleSkip()}
                  >
                    Skip Next Occurrence
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => void handleDelete()}
                  >
                    Delete Permanently
                  </Button>
                </>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void handleSkip()}
                >
                  Delete Bill
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
