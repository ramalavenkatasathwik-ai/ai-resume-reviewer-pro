import React from 'react';
import { ConnectionStatus } from '@/types/api';
import { RefreshCw } from 'lucide-react';

interface StatusBadgeProps {
  status: ConnectionStatus;
  onRefresh?: () => void;
  serviceName?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  onRefresh,
  serviceName,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        status === 'connected'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : status === 'offline'
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      } ${className}`}
      data-testid="status-badge"
    >
      <span className="relative flex h-2 w-2">
        {status === 'connected' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            status === 'connected'
              ? 'bg-emerald-500'
              : status === 'offline'
              ? 'bg-rose-500'
              : 'bg-amber-500'
          }`}
        ></span>
      </span>

      <span className="font-semibold tracking-wide">
        {status === 'connected'
          ? 'Backend Connected'
          : status === 'offline'
          ? 'Backend Offline'
          : 'Checking Backend...'}
      </span>

      {serviceName && status === 'connected' && (
        <span className="hidden sm:inline text-emerald-600/70 border-l border-emerald-300 pl-2">
          {serviceName}
        </span>
      )}

      {onRefresh && (
        <button
          onClick={onRefresh}
          title="Refresh connectivity status"
          className="ml-1 p-0.5 hover:opacity-80 transition-opacity focus:outline-none"
          aria-label="Refresh backend status"
        >
          <RefreshCw className="w-3 h-3 text-current" />
        </button>
      )}
    </div>
  );
};

export default StatusBadge;
