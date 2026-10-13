import React from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { Menu, FileText, Linkedin, Settings, Sparkles, LogIn, LogOut } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { ConnectionStatus } from '@/types/api';
import { useAuth } from '@/context/AuthContext';

interface TopbarProps {
  onOpenMobileSidebar: () => void;
  status: ConnectionStatus;
  serviceName?: string;
  onRefresh?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileSidebar,
  status,
  serviceName,
  onRefresh,
}) => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Overview';
      case '/dashboard':
        return 'Resume Analyzer';
      case '/linkedin':
        return 'LinkedIn Analyzer';
      case '/history':
        return 'Analysis History';
      case '/reports':
        return 'Reports';
      case '/settings':
        return 'Settings';
      case '/login':
        return 'Sign In';
      case '/register':
        return 'Create Account';
      case '/forgot-password':
        return 'Password Recovery';
      case '/reset-password':
        return 'Reset Password';
      default:
        return 'AI Resume & LinkedIn Analyzer Pro';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#141419]/90 backdrop-blur-md border-b border-[#303038] px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-full">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            aria-label="Open sidebar navigation menu"
            className="lg:hidden p-2 rounded-xl text-[#A1A1AA] hover:text-[#F7F7FA] hover:bg-[#1C1C23] focus:outline-none focus:ring-2 focus:ring-[#FF7417]"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-[#F7F7FA] tracking-tight">
              {getPageTitle()}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C91432]/15 text-[#F04452] border border-[#C91432]/30">
              <Sparkles className="w-2.5 h-2.5 text-[#FF7417]" />
              Pro
            </span>
          </div>
        </div>

        {/* Center: Quick Switcher (Tablet & Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-[#0B0B0E] border border-[#303038] text-xs">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                isActive
                  ? 'bg-[#C91432] text-white shadow font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#F7F7FA] hover:bg-[#1C1C23]'
              }`
            }
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Resume Analyzer</span>
          </NavLink>
          <NavLink
            to="/linkedin"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                isActive
                  ? 'bg-[#FF7417] text-[#0B0B0E] font-bold shadow'
                  : 'text-[#A1A1AA] hover:text-[#F7F7FA] hover:bg-[#1C1C23]'
              }`
            }
          >
            <Linkedin className="w-3.5 h-3.5" />
            <span>LinkedIn Analyzer</span>
          </NavLink>
        </div>

        {/* Right: Status Badge & Auth State */}
        <div className="flex items-center gap-3">
          <StatusBadge
            status={status}
            serviceName={serviceName}
            onRefresh={onRefresh}
          />
          <NavLink
            to="/settings"
            aria-label="Quick Settings"
            title="Settings"
            className="p-2 rounded-xl text-[#A1A1AA] hover:text-[#F7F7FA] hover:bg-[#1C1C23] border border-[#303038] transition-colors"
          >
            <Settings className="w-4 h-4" />
          </NavLink>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#303038]">
              <NavLink
                to="/settings"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#1C1C23] hover:bg-[#25252E] border border-[#303038] text-xs font-medium text-[#F7F7FA] transition"
                title={user.email}
              >
                <div className="w-5 h-5 rounded-full bg-primary-red/20 text-bright-red flex items-center justify-center font-bold text-[10px]">
                  {(user.display_name || user.email)[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {user.display_name || user.email.split('@')[0]}
                </span>
              </NavLink>
              <button
                onClick={() => logout()}
                aria-label="Sign Out"
                title="Sign Out"
                className="p-2 rounded-xl text-[#A1A1AA] hover:text-bright-red hover:bg-[#1C1C23] border border-[#303038] transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-[#303038]">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-red hover:bg-bright-red text-white text-xs font-semibold shadow transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
