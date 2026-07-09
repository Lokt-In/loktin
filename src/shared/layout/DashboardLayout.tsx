import { Outlet } from "react-router-dom";
import DashboardTopNav from "./DashboardTopNav";
import UsdcTrustlinePrompt from "../components/UsdcTrustlinePrompt";

/**
 * Dashboard chrome. `.lk-theme` opts this subtree out of the legacy sharp-edge
 * enforcement in base.css so the redesign's rounded surfaces apply.
 */
export default function DashboardLayout() {
  return (
    <div className="lk-theme min-h-screen bg-ink font-body text-white">
      <DashboardTopNav />
      <UsdcTrustlinePrompt />
      <Outlet />
    </div>
  );
}
