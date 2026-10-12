import React from 'react';
import { Check, X, Info, AlertCircle } from 'lucide-react';

export interface ToastProps {
  message: string;
  isOpen?: boolean;
  onClose: () => void;
  type?: 'success' | 'info' | 'error';
  variant?: 'success' | 'info' | 'error';
}

export const Toast: React.FC<ToastProps> = ({
  message,
  isOpen = true,
  onClose,
  type,
  variant = 'success',
}) => {
  if (!isOpen) return null;

  const effectiveType = type || variant;

  return (
    <div
      role="status"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#1C1C23] border border-[#303038] text-xs font-semibold text-[#F7F7FA] shadow-[0_8px_30px_rgba(0,0,0,0.7)] animate-fade-in"
    >
      {effectiveType === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
      {effectiveType === 'info' && <Info className="w-4 h-4 text-[#FF7417] shrink-0" />}
      {effectiveType === 'error' && <AlertCircle className="w-4 h-4 text-[#F04452] shrink-0" />}
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="ml-2 p-0.5 text-[#A1A1AA] hover:text-white focus-visible:outline-none"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default Toast;
