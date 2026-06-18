import { type InputHTMLAttributes, type Ref } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

export default function Input({
  label,
  hint,
  error,
  style,
  ref,
  ...props
}: InputProps) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}
    >
      {label && (
        <label
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--fg-muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        style={{
          background: "var(--bg-base)",
          border: `1px solid ${error ? "var(--status-error)" : "var(--border)"}`,
          color: "var(--fg-primary)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--font-size-sm)",
          padding: "var(--sp-2) var(--sp-3)",
          outline: "none",
          width: "100%",
          transition: "border-color var(--transition-fast)",
          ...style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--accent-primary)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error
            ? "var(--status-error)"
            : "var(--border)";
        }}
        {...props}
      />
      {(hint || error) && (
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: error ? "var(--status-error)" : "var(--fg-muted)",
          }}
        >
          {error || hint}
        </span>
      )}
    </div>
  );
}
