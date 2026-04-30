import { Outlet } from "react-router-dom";
import Header from "./Header";

export default function AppLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
      }}
    >
      <Header />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "var(--sp-4) 0",
          textAlign: "center",
          fontSize: "var(--font-size-xs)",
          color: "var(--fg-muted)",
          letterSpacing: "0.06em",
        }}
      >
        <span>© {new Date().getFullYear()} LOKTIN</span>
      </footer>
    </div>
  );
}
