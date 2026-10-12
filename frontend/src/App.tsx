import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LinkedInAnalyzerPage } from '@/pages/LinkedInAnalyzerPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useHealthCheck } from '@/hooks/useHealthCheck';

export const App: React.FC = () => {
  // Check backend health on mount and periodically every 30 seconds
  const { status, data, error, lastChecked, refresh } = useHealthCheck(30000);

  return (
    <AppShell
      status={status}
      serviceName={data?.service}
      onRefresh={refresh}
    >
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              status={status}
              data={data}
              error={error}
              lastChecked={lastChecked}
              onRefresh={refresh}
            />
          }
        />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/resume" element={<Navigate to="/dashboard" replace />} />
        <Route path="/linkedin" element={<LinkedInAnalyzerPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
};

export default App;
