import React, {
  createContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from "react";

type NotificationType = "success" | "error" | "warning" | "info";

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  visible: boolean;
}

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

const typeStyles: Record<NotificationType, { border: string; color: string }> =
  {
    success: {
      border: "var(--status-success)",
      color: "var(--status-success)",
    },
    error: { border: "var(--status-error)", color: "var(--status-error)" },
    warning: {
      border: "var(--status-warning)",
      color: "var(--status-warning)",
    },
    info: { border: "var(--status-info)", color: "var(--status-info)" },
  };

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (message: string, type: NotificationType) => {
      const id = `${type}-${Date.now()}`;
      setNotifications((prev) => [
        ...prev,
        { id, message, type, visible: true },
      ]);
      setTimeout(
        () =>
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, visible: false } : n)),
          ),
        3000,
      );
      setTimeout(
        () => setNotifications((prev) => prev.filter((n) => n.id !== id)),
        3400,
      );
    },
    [],
  );

  const contextValue = useMemo(() => ({ addNotification }), [addNotification]);

  return (
    <NotificationContext value={contextValue}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "var(--sp-6)",
          right: "var(--sp-6)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "var(--sp-2)",
          maxWidth: 360,
        }}
      >
        {notifications.map((n) => {
          const s = typeStyles[n.type];
          return (
            <div
              key={n.id}
              style={{
                background: "var(--bg-elevated)",
                border: `1px solid ${s.border}`,
                borderLeft: `4px solid ${s.border}`,
                padding: "var(--sp-3) var(--sp-4)",
                fontSize: "var(--font-size-sm)",
                color: "var(--fg-primary)",
                opacity: n.visible ? 1 : 0,
                transform: n.visible ? "translateX(0)" : "translateX(20px)",
                transition: "opacity 350ms ease, transform 350ms ease",
              }}
            >
              <span
                style={{
                  color: s.color,
                  fontWeight: 600,
                  marginRight: "var(--sp-2)",
                }}
              >
                {n.type.toUpperCase()}
              </span>
              {n.message}
            </div>
          );
        })}
      </div>
    </NotificationContext>
  );
};

export { NotificationContext };
export type { NotificationContextType, NotificationType };
