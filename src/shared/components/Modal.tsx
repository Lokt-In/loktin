import { ReactNode, useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  width = "500px",
}: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(11, 30, 30, 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--sp-4)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-accent)",
          width,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {title && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "var(--sp-4) var(--sp-6)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: "var(--font-size-md)",
                letterSpacing: "0.04em",
              }}
            >
              {title}
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--fg-muted)",
                cursor: "pointer",
                fontSize: "var(--font-size-lg)",
                lineHeight: 1,
                padding: "var(--sp-1)",
              }}
            >
              ×
            </button>
          </div>
        )}
        <div style={{ padding: "var(--sp-6)", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
