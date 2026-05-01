import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/pages/DashboardPage";
import { SubmissionsPage } from "@/pages/SubmissionsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { FeedbacksPage } from "@/pages/FeedbacksPage";
import { RunPage } from "@/pages/RunPage";
import { LogsPage } from "@/pages/LogsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="/submissions" element={<SubmissionsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/feedbacks" element={<FeedbacksPage />} />
        <Route path="/run" element={<RunPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
