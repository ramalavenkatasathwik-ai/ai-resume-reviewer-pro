import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LandingPage } from '@/pages/LandingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LinkedInAnalyzerPage } from '@/pages/LinkedInAnalyzerPage';
import { CustomCursor } from '@/components/CustomCursor';
import { useHealthCheck } from '@/hooks/useHealthCheck';

export const App: React.FC = () => {
  // Check health on mount and periodically every 30 seconds
  const { status, data, error, lastChecked, refresh } = useHealthCheck(30000);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <CustomCursor />
      <Navbar
        status={status}
        serviceName={data?.service}
        onRefresh={refresh}
      />

      <main className="flex-1">
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
          <Route path="/linkedin" element={<LinkedInAnalyzerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;
