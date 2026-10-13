import React from 'react';
import { X, ArrowRight, CheckCircle, FileText } from 'lucide-react';
import { VariantComparisonResponse } from '@/types/careerIntelligence';

interface VariantComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  diff: VariantComparisonResponse | null;
  onApplyVariant?: () => void;
}

export const VariantComparisonModal: React.FC<VariantComparisonModalProps> = ({
  isOpen,
  onClose,
  diff,
  onApplyVariant,
}) => {
  if (!isOpen || !diff) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl bg-[#141419] border border-white/10 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1B1B22]/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FF7417]/20 text-[#FF9B45] border border-[#FF7417]/30">
                Side-by-Side Comparison
              </span>
              <span className="text-xs text-[#A1A1AA]">Target Role: {diff.target_role}</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{diff.base_title}</span>
              <ArrowRight className="w-4 h-4 text-[#A1A1AA]" />
              <span className="text-[#FF9B45]">{diff.variant_title}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Summary of differences */}
          {diff.summary_of_differences && diff.summary_of_differences.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#1B1B22] border border-white/5 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Key Modifications Overview
              </h3>
              <ul className="space-y-1.5">
                {diff.summary_of_differences.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section Diffs */}
          <div className="space-y-4">
            {diff.sections.map((sec, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/5 bg-[#0B0B0E]/60 overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-[#1B1B22] border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#FF7417]" />
                    {sec.section_name}
                  </span>
                  <span className="text-[11px] text-[#A1A1AA]">{sec.changes_summary}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 text-xs">
                  {/* Base Version */}
                  <div className="p-4 space-y-1">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                      Original Content
                    </span>
                    <div className="text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                      {typeof sec.original_content === 'object'
                        ? JSON.stringify(sec.original_content, null, 2)
                        : String(sec.original_content || 'Empty')}
                    </div>
                  </div>

                  {/* Variant Version */}
                  <div className="p-4 space-y-1 bg-gradient-to-br from-[#FF7417]/5 to-transparent">
                    <span className="text-[10px] font-semibold text-[#FF9B45] uppercase tracking-wider block">
                      Tailored Variant
                    </span>
                    <div className="text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed">
                      {typeof sec.variant_content === 'object'
                        ? JSON.stringify(sec.variant_content, null, 2)
                        : String(sec.variant_content || 'Empty')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-white/10 bg-[#1B1B22]/50 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Factual integrity preserved. Verify bullet specifics before publishing.
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[#A1A1AA] hover:text-white hover:bg-white/5 transition"
            >
              Close
            </button>
            {onApplyVariant && (
              <button
                type="button"
                onClick={() => {
                  onApplyVariant();
                  onClose();
                }}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#C91432] to-[#FF7417] text-white hover:opacity-90 transition shadow-lg shadow-[#C91432]/20"
              >
                Apply This Variant
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
