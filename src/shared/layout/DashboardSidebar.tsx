import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/plans", label: "Plans", end: false },
  { to: "/dashboard/targets", label: "Target Savings", end: false },
  { to: "/dashboard/locked", label: "Locked In", end: false },
  { to: "/dashboard/spend-save", label: "Spend & Save", end: false },
];

export default function DashboardSidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{
          display: "none",
          flexDirection: "column",
          gap: 0,
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          padding: "var(--sp-6) 0",
        }}
        className="dashboard-sidebar-desktop"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              padding: "var(--sp-3) var(--sp-5)",
              fontSize: "var(--font-size-sm)",
              color: isActive ? "var(--fg-primary)" : "var(--fg-muted)",
              borderLeft: isActive
                ? "2px solid var(--accent-primary)"
                : "2px solid transparent",
              background: isActive ? "var(--bg-surface)" : "transparent",
              textDecoration: "none",
              letterSpacing: "0.04em",
              transition: "all var(--transition-fast)",
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </aside>

      {/* Mobile/tablet horizontal tabs */}
      <nav
        className="dashboard-tabs-mobile"
        style={{
          display: "flex",
          overflowX: "auto",
          borderBottom: "1px solid var(--border)",
          marginBottom: "var(--sp-4)",
          gap: 0,
        }}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              padding: "var(--sp-3) var(--sp-4)",
              fontSize: "var(--font-size-xs)",
              color: isActive ? "var(--fg-primary)" : "var(--fg-muted)",
              borderBottom: isActive
                ? "2px solid var(--accent-primary)"
                : "2px solid transparent",
              textDecoration: "none",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              flexShrink: 0,
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <style>{`
        @media (min-width: 900px) {
          .dashboard-sidebar-desktop { display: flex !important; }
          .dashboard-tabs-mobile     { display: none !important; }
        }
      `}</style>
    </>
  );
}
