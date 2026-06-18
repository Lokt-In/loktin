import { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export default function Card({
  children,
  style,
  className,
  onClick,
  hoverable,
}: CardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        padding: "var(--sp-6)",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color var(--transition-fast)",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.borderColor = "var(--border-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.borderColor = "var(--border)";
        }
      }}
    >
      {children}
    </div>
  );
}
