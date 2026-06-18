import { useState } from "react";
import { NewBill, BILL_CATEGORIES } from "../hooks/useBills";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";

interface Props {
  onSubmit: (bills: NewBill[]) => Promise<boolean>;
  submitting: boolean;
  availableUsdc: number;
}

const EMPTY_BILL: NewBill = {
  name: "",
  amount: "",
  dueDate: "",
  isRecurring: false,
  category: "Other",
};

export default function AddBillsForm({
  onSubmit,
  submitting,
  availableUsdc,
}: Props) {
  const [bills, setBills] = useState<NewBill[]>([{ ...EMPTY_BILL }]);

  const update = (i: number, field: keyof NewBill, value: unknown) => {
    setBills((prev) =>
      prev.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)),
    );
  };

  const add = () => setBills((prev) => [...prev, { ...EMPTY_BILL }]);
  const remove = (i: number) =>
    setBills((prev) => prev.filter((_, idx) => idx !== i));

  const totalNew = bills.reduce(
    (sum, b) => sum + (parseFloat(b.amount) || 0),
    0,
  );

  const handleSubmit = async () => {
    for (const b of bills) {
      if (!b.name || !b.amount || !b.dueDate) {
        alert("Fill in all fields for each bill.");
        return;
      }
      const day = new Date(b.dueDate).getDate();
      if (day < 1 || day > 28) {
        alert("Due dates must be day 1–28 (for February compatibility).");
        return;
      }
    }
    if (totalNew > availableUsdc) {
      alert(
        `Total ${totalNew.toFixed(2)} USDC exceeds available ${availableUsdc.toFixed(2)} USDC.`,
      );
      return;
    }
    const ok = await onSubmit(bills);
    if (ok) setBills([{ ...EMPTY_BILL }]);
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}
    >
      {bills.map((bill, i) => (
        <div
          key={i}
          style={{
            border: "1px solid var(--border)",
            padding: "var(--sp-4)",
            background: "var(--bg-base)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "var(--sp-4)",
            }}
          >
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-muted)",
              }}
            >
              Bill #{i + 1}
            </span>
            {bills.length > 1 && (
              <Button variant="muted" size="sm" onClick={() => remove(i)}>
                Remove
              </Button>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr",
              gap: "var(--sp-3)",
              marginBottom: "var(--sp-3)",
            }}
          >
            <Input
              label="Name"
              placeholder="e.g. Rent, Netflix"
              value={bill.name}
              onChange={(e) => update(i, "name", e.target.value)}
            />
            <Input
              label="Amount (USDC)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={bill.amount}
              onChange={(e) => update(i, "amount", e.target.value)}
            />
            <Input
              label="Due Date (day 1–28)"
              type="date"
              value={bill.dueDate}
              onChange={(e) => update(i, "dueDate", e.target.value)}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--sp-3)",
              alignItems: "end",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--sp-2)",
              }}
            >
              <label
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--fg-muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Category
              </label>
              <select
                value={bill.category}
                onChange={(e) => update(i, "category", e.target.value)}
                style={{
                  background: "var(--bg-base)",
                  color: "var(--fg-primary)",
                  border: "1px solid var(--border)",
                  padding: "var(--sp-2) var(--sp-3)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-sm)",
                  outline: "none",
                }}
              >
                {BILL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--sp-2)",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                color: "var(--fg-secondary)",
                paddingBottom: "var(--sp-2)",
              }}
            >
              <input
                type="checkbox"
                checked={bill.isRecurring}
                onChange={(e) => update(i, "isRecurring", e.target.checked)}
                style={{ accentColor: "var(--accent-primary)" }}
              />
              Recurring monthly bill
            </label>
          </div>
        </div>
      ))}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Button variant="ghost" size="sm" onClick={add}>
          + Add Another Bill
        </Button>
        <span
          style={{ fontSize: "var(--font-size-xs)", color: "var(--fg-muted)" }}
        >
          Total:{" "}
          <strong
            style={{
              color:
                totalNew > availableUsdc
                  ? "var(--status-error)"
                  : "var(--fg-primary)",
            }}
          >
            {totalNew.toFixed(2)}
          </strong>{" "}
          / {availableUsdc.toFixed(2)} USDC
        </span>
      </div>

      <Button
        variant="primary"
        size="md"
        onClick={() => void handleSubmit()}
        isLoading={submitting}
        style={{ alignSelf: "flex-start" }}
      >
        Submit {bills.length} Bill{bills.length !== 1 ? "s" : ""} →
      </Button>
    </div>
  );
}
