import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Footer } from '@/components/Footer';
import { CustomCursor } from '@/components/CustomCursor';
import { ConnectionStatus } from '@/types/api';

interface AppShellProps {
  children: React.ReactNode;
  status: ConnectionStatus;
  serviceName?: string;
  onRefresh?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  status,
  serviceName,
  onRefresh,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('sidebar_collapsed', String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  const toggleCollapse = () => setCollapsed((prev) => !prev);
  const openMobile = () => setIsOpenMobile(true);
  const closeMobile = () => setIsOpenMobile(false);

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-[#F7F7FA] flex flex-col font-sans selection:bg-[#FF7417]/25 selection:text-[#FF9B45]">
      {/* Desktop interactive custom cursor */}
      <CustomCursor />

      <div className="flex flex-1 min-h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          isOpenMobile={isOpenMobile}
          onCloseMobile={closeMobile}
          status={status}
          serviceName={serviceName}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0B0B0E] overflow-y-auto">
          <Topbar
            onOpenMobileSidebar={openMobile}
            status={status}
            serviceName={serviceName}
            onRefresh={onRefresh}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
};

export default AppShell;
