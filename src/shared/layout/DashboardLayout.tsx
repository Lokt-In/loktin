import { Outlet } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";
import UsdcTrustlinePrompt from "../components/UsdcTrustlinePrompt";

export default function DashboardLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "calc(100vh - var(--nav-height))",
        flexDirection: "column",
      }}
    >
      <div
        style={{ display: "flex", flex: 1 }}
        className="dashboard-layout-flex"
      >
        <DashboardSidebar />
        <div style={{ flex: 1, minWidth: 0 }}>
          <UsdcTrustlinePrompt />
          <Outlet />
        </div>
      </div>
      <style>{`
        @media (min-width: 900px) {
          .dashboard-layout-flex { flex-direction: row; }
        }
        @media (max-width: 899px) {
          .dashboard-layout-flex { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
