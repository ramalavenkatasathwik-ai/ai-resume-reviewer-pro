import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';

interface SectionAnalysisCardProps {
  id: string;
  title: string;
  subtitle?: string;
  score?: number | null;
  isAvailable?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  supportingEvidence?: string[];
  recommendedAction?: string;
  className?: string;
}

const getScoreBadgeClass = (score?: number | null) => {
  if (score === undefined || score === null) {
    return 'bg-[#1C1C23] text-slate-400 border-[#303038]';
  }
  if (score >= 85) {
    return 'bg-emerald-950/70 text-emerald-400 border-emerald-800';
  }
  if (score >= 70) {
    return 'bg-amber-950/70 text-amber-400 border-amber-800';
  }
  return 'bg-rose-950/70 text-[#F04452] border-rose-800';
};

export const SectionAnalysisCard: React.FC<SectionAnalysisCardProps> = ({
  id,
  title,
  subtitle,
  score,
  isAvailable = true,
  icon,
  children,
  defaultExpanded = true,
  supportingEvidence = [],
  recommendedAction,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      id={`section-${id}`}
      className={`bg-[#141419] rounded-2xl border border-[#303038] overflow-hidden transition-all ${className}`}
    >
      {/* Header Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="w-full px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between text-left hover:bg-[#1C1C23]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7417]"
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-[#1C1C23] border border-[#303038] text-[#FF7417] flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm sm:text-base font-bold text-white truncate">{title}</h4>
              {!isAvailable && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-800/40">
                  Not Provided in Input
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Section Score */}
          {score !== undefined && score !== null ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-mono text-slate-400 hidden sm:inline">
                Score:
              </span>
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-lg border font-mono ${getScoreBadgeClass(
                  score
                )}`}
              >
                {score}/100
              </span>
            </div>
          ) : (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1C1C23] text-slate-400 border border-[#303038]">
              Not available
            </span>
          )}

          {/* Expand/Collapse Chevron */}
          <div className="w-7 h-7 rounded-lg bg-[#1C1C23] flex items-center justify-center text-slate-400">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="px-5 pb-6 sm:px-6 sm:pb-6 border-t border-[#303038] pt-5 space-y-4">
          {children}

          {/* Supporting Evidence Chips (if any) */}
          {supportingEvidence.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1.5 text-xs">
              <p className="font-bold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Detected Profile Evidence:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                {supportingEvidence.map((ev, idx) => (
                  <li key={idx}>{ev}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Action (if any) */}
          {recommendedAction && (
            <div className="p-3.5 rounded-xl bg-[#1C1C23] border border-[#303038] flex items-start gap-2.5 text-xs text-[#FF9B45]">
              <AlertCircle className="w-4 h-4 text-[#FF7417] mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-[#FF7417]">Recommended Strategic Action: </span>
                <span className="text-slate-300">{recommendedAction}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SectionAnalysisCard;
