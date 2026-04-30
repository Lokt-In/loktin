import { NavLink } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import WalletButton from "../../components/WalletButton";

export default function Header() {
  const { address } = useWallet();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: "var(--nav-height)",
        background: "var(--bg-base)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <NavLink
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-2)",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: 700,
              color: "var(--fg-primary)",
              letterSpacing: "0.12em",
            }}
          >
            LOKTIN
          </span>
        </NavLink>

        {address && (
          <nav
            style={{
              display: "flex",
              gap: "var(--sp-1)",
              alignItems: "center",
            }}
          >
            {[
              { to: "/dashboard", label: "Dashboard" },
              { to: "/analytics", label: "Analytics" },
              { to: "/templates", label: "Templates" },
              { to: "/profile", label: "Profile" },
            ].map(({ to, label }) => (
              <NavLink key={to} to={to} style={{ textDecoration: "none" }}>
                {({ isActive }) => (
                  <span
                    style={{
                      padding: "var(--sp-2) var(--sp-3)",
                      fontSize: "var(--font-size-xs)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: isActive ? "var(--fg-primary)" : "var(--fg-muted)",
                      borderBottom: isActive
                        ? "2px solid var(--accent-primary)"
                        : "2px solid transparent",
                      transition: "all var(--transition-fast)",
                      display: "block",
                    }}
                  >
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        )}

        <WalletButton />
      </div>
    </header>
  );
}
