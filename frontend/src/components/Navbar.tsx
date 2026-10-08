import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { ConnectionStatus } from '@/types/api';

interface NavbarProps {
  status: ConnectionStatus;
  serviceName?: string;
  onRefresh?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ status, serviceName, onRefresh }) => {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-indigo-50 text-indigo-700 font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-sm group-hover:shadow transition-shadow">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-lg tracking-tight">
                  AI Resume Reviewer <span className="text-indigo-600 font-extrabold">Pro</span>
                </span>
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                  Phase 1
                </span>
              </div>
            </NavLink>

            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
              <NavLink to="/dashboard" className={navLinkClass}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
              <NavLink to="/settings" className={navLinkClass}>
                <SettingsIcon className="w-4 h-4" />
                Settings
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge
              status={status}
              serviceName={serviceName}
              onRefresh={onRefresh}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
