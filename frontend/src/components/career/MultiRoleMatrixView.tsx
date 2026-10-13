import React from 'react';
import {
  Trophy,
  ArrowUpRight,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { MultiRoleCompareResponse } from '@/types/careerIntelligence';

interface MultiRoleMatrixViewProps {
  comparison: MultiRoleCompareResponse;
  onGenerateVariant?: (role: string) => void;
}

export const MultiRoleMatrixView: React.FC<MultiRoleMatrixViewProps> = ({
  comparison,
  onGenerateVariant,
}) => {
  const roles = comparison.roles_evaluated;

  return (
    <div className="space-y-6">
      {/* Best Fit Banner & Trade-Offs Summary */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#141419] to-[#1B1B22] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Optimal Immediate Alignment
            </span>
            <span className="text-xs text-[#A1A1AA]">
              Scoring Model: {comparison.scoring_version}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            Top Recommendation: <span className="text-[#FF9B45]">{comparison.best_fit_role}</span>
          </h2>
          <p className="text-xs text-zinc-300 mt-2 max-w-3xl leading-relaxed">
            {comparison.trade_offs_summary}
          </p>
        </div>

        {onGenerateVariant && (
          <button
            type="button"
            onClick={() => onGenerateVariant(comparison.best_fit_role)}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#C91432] to-[#FF7417] text-white hover:opacity-90 transition shadow-lg shadow-[#C91432]/20 flex items-center gap-2 self-start md:self-auto flex-shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Tailor Best Fit Variant
          </button>
        )}
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => {
          const res = comparison.role_results[role];
          if (!res) return null;
          const isBest = role === comparison.best_fit_role;

          return (
            <div
              key={role}
              className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-200 ${
                isBest
                  ? 'bg-[#141419] border-[#FF7417]/50 shadow-xl shadow-[#FF7417]/10'
                  : 'bg-[#141419] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {isBest && (
                      <span className="text-[10px] font-bold text-[#FF9B45] uppercase tracking-wider block mb-1">
                        Best Evidenced Match
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-white">{role}</h3>
                  </div>

                  {/* Score Pill */}
                  <div
                    className={`px-3 py-1 rounded-xl text-center font-bold text-sm ${
                      res.overall_score >= 80
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : res.overall_score >= 60
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {res.overall_score}
                    <span className="text-[10px] font-normal block text-zinc-400">/ 100</span>
                  </div>
                </div>

                {/* Score Breakdown Bars */}
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Required Skills</span>
                      <span className="font-mono text-zinc-300">{res.required_skills_score}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-[#FF7417] rounded-full"
                        style={{ width: `${res.required_skills_score}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Experience Alignment</span>
                      <span className="font-mono text-zinc-300">{res.experience_score}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${res.experience_score}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Keyword Density</span>
                      <span className="font-mono text-zinc-300">{res.keyword_score}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${res.keyword_score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Evidenced Skills */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Matching Evidenced Skills ({res.evidenced_skills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {res.evidenced_skills.slice(0, 5).map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1"
                      >
                        <CheckCircle className="w-2.5 h-2.5" />
                        {s}
                      </span>
                    ))}
                    {res.evidenced_skills.length === 0 && (
                      <span className="text-zinc-500 text-[11px]">No direct matches detected</span>
                    )}
                  </div>
                </div>

                {/* Missing Skills */}
                {res.missing_required_skills.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block">
                      Missing Required Skills ({res.missing_required_skills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {res.missing_required_skills.slice(0, 4).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1"
                        >
                          <AlertCircle className="w-2.5 h-2.5" />
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended improvements */}
                {res.suggested_improvements && res.suggested_improvements.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#1B1B22] border border-white/5 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA] block">
                      Actionable Next Step
                    </span>
                    <p className="text-xs text-zinc-300">{res.suggested_improvements[0]}</p>
                  </div>
                )}
              </div>

              {/* Action */}
              {onGenerateVariant && (
                <div className="pt-4 mt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => onGenerateVariant(role)}
                    className="w-full py-2 rounded-xl text-xs font-semibold bg-[#1B1B22] text-white hover:bg-white/10 transition flex items-center justify-center gap-1.5"
                  >
                    Generate {role} Variant
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#FF7417]" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
