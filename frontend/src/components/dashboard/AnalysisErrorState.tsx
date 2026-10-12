import React from 'react';
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react';

interface AnalysisErrorStateProps {
  errorMessage?: string;
  message?: string;
  title?: string;
  onRetry?: () => void;
  onReset: () => void;
}

export const AnalysisErrorState: React.FC<AnalysisErrorStateProps> = ({
  errorMessage,
  message,
  title = 'Unable to Complete Profile Evaluation',
  onRetry,
  onReset,
}) => {
  const displayMessage =
    errorMessage ||
    message ||
    'An unexpected error occurred while communicating with the analysis service. Please verify your Gemini API key and profile input.';

  return (
    <div
      role="alert"
      className="bg-[#141419] rounded-2xl border-2 border-[#C91432]/60 shadow-[0_0_30px_rgba(201,20,50,0.2)] p-6 sm:p-8 space-y-6"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#C91432]/20 border border-[#C91432] text-[#F04452] flex items-center justify-center shrink-0">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1.5 flex-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#C91432]/30 text-[#F04452] border border-[#C91432]/50">
            Analysis Failed
          </span>
          <h3 className="text-base sm:text-lg font-bold text-white">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            {displayMessage}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#282834]">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C91432] to-[#FF7417] text-white text-xs font-bold hover:brightness-110 transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Analysis</span>
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2.5 rounded-xl bg-[#1E1E26] hover:bg-[#282834] border border-[#303038] text-slate-200 text-xs font-bold transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Start Over</span>
        </button>
      </div>
    </div>
  );
};

export default AnalysisErrorState;
