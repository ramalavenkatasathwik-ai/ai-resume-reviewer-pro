import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = 'Processing Error',
  message,
  onRetry,
  onDismiss,
  className = '',
}) => {
  return (
    <div
      className={`bg-rose-950/40 border border-[#F04452]/60 rounded-xl p-4 flex items-start justify-between gap-3 text-xs text-rose-200 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-[#F04452] mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-bold text-white">{title}</p>
          <p className="text-rose-200/90 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-900 border border-rose-700 text-[11px] font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7417]"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="p-1 rounded text-rose-300 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorBanner;
