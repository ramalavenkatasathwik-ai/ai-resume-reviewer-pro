import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FileText,
  Linkedin,
  History,
  FileBarChart2,
  Settings as SettingsIcon,
  Home,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Files,
  Briefcase,
} from 'lucide-react';
import { ConnectionStatus } from '@/types/api';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  status: ConnectionStatus;
  serviceName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  status,
  serviceName,
}) => {
  const navItems = [
    { to: '/', label: 'Overview', icon: Home, end: true },
    { to: '/dashboard', label: 'Resume Analyzer', icon: FileText },
    { to: '/linkedin', label: 'LinkedIn Analyzer', icon: Linkedin },
    { to: '/job-match', label: 'Job Match', icon: Briefcase },
    { to: '/resumes', label: 'My Resumes', icon: Files },
    { to: '/reports', label: 'My Reports', icon: FileBarChart2 },
    { to: '/history', label: 'Analysis History', icon: History },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    return `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group relative ${
      isActive
        ? 'bg-[#C91432] text-white shadow-lg shadow-[#C91432]/20 font-semibold'
        : 'text-[#A1A1AA] hover:text-[#F7F7FA] hover:bg-[#1C1C23]'
    }`;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-[#141419] border-r border-[#303038] transition-all duration-300 ease-in-out lg:static ${
          collapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          isOpenMobile
            ? 'translate-x-0 w-64'
            : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Sidebar Navigation"
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#303038]">
          <NavLink
            to="/"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C91432] via-[#F04452] to-[#FF7417] flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {(!collapsed || isOpenMobile) && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm tracking-tight text-[#F7F7FA] truncate">
                  AI Resume <span className="text-[#FF7417]">Pro</span>
                </span>
                <span className="text-[10px] text-[#A1A1AA] font-mono truncate">
                  & LinkedIn Analyzer
                </span>
              </div>
            )}
          </NavLink>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F7F7FA] hover:bg-[#1C1C23] transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Workflow Quick Switcher */}
        {(!collapsed || isOpenMobile) && (
          <div className="p-3">
            <div className="p-1 rounded-xl bg-[#0B0B0E] border border-[#303038] grid grid-cols-2 gap-1 text-xs">
              <NavLink
                to="/dashboard"
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-[#C91432] text-white shadow'
                      : 'text-[#A1A1AA] hover:text-[#F7F7FA] hover:bg-[#1C1C23]'
                  }`
                }
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Resume</span>
              </NavLink>
              <NavLink
                to="/linkedin"
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-[#FF7417] text-[#0B0B0E] font-bold shadow'
                      : 'text-[#A1A1AA] hover:text-[#F7F7FA] hover:bg-[#1C1C23]'
                  }`
                }
              >
                <Linkedin className="w-3.5 h-3.5" />
                <span>LinkedIn</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                className={getNavLinkClass}
                title={collapsed ? item.label : undefined}
                aria-label={item.to === '/dashboard' ? 'Dashboard' : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {(!collapsed || isOpenMobile) && (
                  <span className="truncate">{item.label}</span>
                )}
                {/* Active indicator dot for collapsed mode */}
                {collapsed && !isOpenMobile && (
                  <span className="sr-only">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* BYOK Privacy Seal */}
        {(!collapsed || isOpenMobile) && (
          <div className="p-3 mx-3 mb-2 rounded-xl bg-[#1C1C23]/60 border border-[#303038] text-[11px] text-[#A1A1AA]">
            <div className="flex items-center gap-1.5 text-[#FF7417] font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>BYOK Architecture</span>
            </div>
            <p className="leading-relaxed">
              Your Gemini API key stays private in browser memory. Never saved to backend tables.
            </p>
          </div>
        )}

        {/* System Connectivity Footer */}
        <div className="p-3 border-t border-[#303038]">
          <div
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[#0B0B0E] border border-[#303038] ${
              collapsed && !isOpenMobile ? 'justify-center' : ''
            }`}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {status === 'connected' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  status === 'connected'
                    ? 'bg-emerald-500'
                    : status === 'offline'
                    ? 'bg-[#C91432]'
                    : 'bg-amber-500'
                }`}
              />
            </span>

            {(!collapsed || isOpenMobile) && (
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-semibold text-[#F7F7FA] truncate">
                  {status === 'connected'
                    ? 'API Connected'
                    : status === 'offline'
                    ? 'API Offline'
                    : 'Checking API...'}
                </span>
                {serviceName && status === 'connected' && (
                  <span className="text-[10px] text-[#A1A1AA] font-mono truncate">
                    {serviceName}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
