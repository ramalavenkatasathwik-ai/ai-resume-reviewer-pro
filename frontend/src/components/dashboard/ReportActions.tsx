import React from 'react';
import { Printer, Mail, RotateCcw } from 'lucide-react';

interface ReportActionsProps {
  onNewAnalysis?: () => void;
  className?: string;
}

export const ReportActions: React.FC<ReportActionsProps> = ({
  onNewAnalysis,
  className = '',
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`flex flex-wrap items-center gap-2.5 no-print ${className}`}>
      {/* Print / Save PDF Button */}
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1C1C23] hover:bg-[#282834] border border-[#303038] text-xs font-bold text-slate-200 hover:text-white transition-all button-press focus-visible:ring-2 focus-visible:ring-[#FF7417]"
      >
        <Printer className="w-3.5 h-3.5 text-[#FF7417]" />
        <span>Print / Save PDF Report</span>
      </button>

      {/* Email Report Button (Disabled with honest labeling) */}
      <div className="relative group">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Email delivery — coming in a later phase"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141419] border border-[#282834] text-xs font-semibold text-slate-500 cursor-not-allowed opacity-70"
        >
          <Mail className="w-3.5 h-3.5 text-slate-600" />
          <span>Email Report</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1C1C23] text-slate-400 border border-[#282834] font-mono">
            Coming Soon
          </span>
        </button>
      </div>

      {/* New Analysis Button */}
      {onNewAnalysis && (
        <button
          type="button"
          onClick={onNewAnalysis}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141419] hover:bg-[#1E1E26] border border-[#303038] text-xs font-bold text-slate-300 hover:text-white transition-all button-press focus-visible:ring-2 focus-visible:ring-[#FF7417]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Analysis</span>
        </button>
      )}

    </div>
  );
};

export default ReportActions;
