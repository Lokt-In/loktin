import { CSSProperties, ReactNode } from "react";

type BadgeVariant =
  | "active"
  | "ended"
  | "paid"
  | "pending"
  | "recurring"
  | "emergency"
  | "neutral"
  | "accent";

const variantMap: Record<
  BadgeVariant,
  { bg: string; color: string; border: string }
> = {
  active: {
    bg: "rgba(61, 139, 110, 0.15)",
    color: "var(--status-success)",
    border: "var(--status-success)",
  },
  ended: {
    bg: "rgba(141, 167, 190, 0.08)",
    color: "var(--fg-muted)",
    border: "var(--border)",
  },
  paid: {
    bg: "rgba(61, 139, 110, 0.15)",
    color: "var(--status-success)",
    border: "var(--status-success)",
  },
  pending: {
    bg: "rgba(139, 112, 64, 0.15)",
    color: "var(--status-warning)",
    border: "var(--status-warning)",
  },
  recurring: {
    bg: "rgba(81, 77, 128, 0.2)",
    color: "var(--accent-primary)",
    border: "var(--accent-primary)",
  },
  emergency: {
    bg: "rgba(139, 61, 74, 0.15)",
    color: "var(--status-error)",
    border: "var(--status-error)",
  },
  neutral: {
    bg: "var(--bg-elevated)",
    color: "var(--fg-secondary)",
    border: "var(--border)",
  },
  accent: {
    bg: "rgba(89, 65, 87, 0.2)",
    color: "var(--accent-secondary)",
    border: "var(--accent-secondary)",
  },
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  style?: CSSProperties;
}

export default function Badge({
  variant = "neutral",
  children,
  style,
}: BadgeProps) {
  const v = variantMap[variant];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px var(--sp-2)",
        fontSize: "var(--font-size-xs)",
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
