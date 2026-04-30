import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "muted";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<string, string> = {
  primary: `background: var(--accent-primary); color: var(--fg-primary); border: 1px solid var(--accent-primary);`,
  ghost: `background: transparent; color: var(--fg-primary); border: 1px solid var(--border-hover);`,
  danger: `background: var(--status-error); color: var(--fg-primary); border: 1px solid var(--status-error);`,
  muted: `background: transparent; color: var(--fg-muted); border: 1px solid var(--border);`,
};

const sizeStyles: Record<string, string> = {
  sm: `padding: var(--sp-1) var(--sp-3); font-size: var(--font-size-xs);`,
  md: `padding: var(--sp-2) var(--sp-4); font-size: var(--font-size-sm);`,
  lg: `padding: var(--sp-3) var(--sp-6); font-size: var(--font-size-md);`,
};

export default function Button({
  variant = "primary",
  size = "md",
  isLoading,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--sp-2)",
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        letterSpacing: "0.02em",
        cursor: disabled || isLoading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "var(--transition-fast)",
        whiteSpace: "nowrap",
        ...Object.fromEntries(
          variantStyles[variant]
            .split(";")
            .filter(Boolean)
            .map((s) => {
              const [k, ...v] = s.split(":");
              return [
                k
                  .trim()
                  .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
                v.join(":").trim(),
              ];
            }),
        ),
        ...Object.fromEntries(
          sizeStyles[size]
            .split(";")
            .filter(Boolean)
            .map((s) => {
              const [k, ...v] = s.split(":");
              return [
                k
                  .trim()
                  .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
                v.join(":").trim(),
              ];
            }),
        ),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          (e.currentTarget as HTMLButtonElement).style.filter =
            "brightness(1.15)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.filter = "";
      }}
      {...props}
    >
      {isLoading ? <span style={{ opacity: 0.7 }}>Loading…</span> : children}
    </button>
  );
}
