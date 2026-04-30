import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./shared/layout/AppLayout";
import DashboardLayout from "./shared/layout/DashboardLayout";
import Landing from "./pages/Landing";
import Overview from "./pages/dashboard/Overview";
import Plans from "./pages/dashboard/Plans";
import Targets from "./pages/dashboard/Targets";
import Locked from "./pages/dashboard/Locked";
import SpendSave from "./pages/dashboard/SpendSave";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Templates from "./pages/Templates";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="plans" element={<Plans />} />
          <Route path="targets" element={<Targets />} />
          <Route path="locked" element={<Locked />} />
          <Route path="spend-save" element={<SpendSave />} />
        </Route>
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
