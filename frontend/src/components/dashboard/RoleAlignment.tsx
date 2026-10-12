import React from 'react';
import { Target, CheckCircle2, AlertTriangle, ShieldCheck, Tag } from 'lucide-react';
import { LinkedInAnalysisResult } from '@/types/linkedin';

interface RoleAlignmentProps {
  result: LinkedInAnalysisResult;
}

export const RoleAlignment: React.FC<RoleAlignmentProps> = ({ result }) => {
  const alignment = result.target_role_alignment;
  const alignmentScore = alignment?.alignment_score ?? result.section_scores?.target_role_alignment?.score;
  const targetRole = alignment?.target_role || result.target_role || 'Target Role';

  const demonstrated = alignment?.demonstrated_competencies || [];
  const skillGaps = alignment?.critical_skill_gaps || [];
  const foundKeywords = result.keyword_analysis?.found_keywords || [];
  const missingKeywords = result.keyword_analysis?.missing_critical_keywords || alignment?.recommended_keywords || [];

  return (
    <div className="bg-[#141419] rounded-2xl border border-[#303038] p-6 sm:p-8 space-y-6">
      {/* Header with Benchmark Role and Score */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#303038]">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#FF7417]" />
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              Target-Role Alignment Benchmark
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Benchmarked against competitive hiring criteria for <span className="text-[#FF7417] font-semibold">{targetRole}</span>
          </p>
        </div>

        {alignmentScore !== undefined && alignmentScore !== null && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Role Fit Index:
            </span>
            <span
              className={`text-lg font-black px-3 py-1 rounded-xl border font-mono ${
                alignmentScore >= 85
                  ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800'
                  : alignmentScore >= 70
                  ? 'bg-amber-950/70 text-amber-400 border-amber-800'
                  : 'bg-rose-950/70 text-[#F04452] border-rose-800'
              }`}
            >
              {alignmentScore}/100
            </span>
          </div>
        )}
      </div>

      {/* Competencies vs Gaps Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Demonstrated Competencies */}
        <div className="p-5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Demonstrated Competencies for {targetRole}
            </h4>
          </div>
          {demonstrated.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-300">
              {demonstrated.map((comp, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span className="leading-relaxed">{comp}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No core technical competencies directly verified in profile data.
            </p>
          )}
        </div>

        {/* Critical Skill Gaps */}
        <div className="p-5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-3">
          <div className="flex items-center gap-2 text-[#F04452]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Critical Skill Gaps to Bridge
            </h4>
          </div>
          {skillGaps.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-300">
              {skillGaps.map((gap, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#F04452] font-bold shrink-0 mt-0.5">⚠</span>
                  <span className="leading-relaxed">{gap}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Profile evidence satisfies primary baseline skills for this role.
            </p>
          )}
        </div>
      </div>

      {/* Matched vs Missing Keywords */}
      <div className="p-5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#FF7417]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Recruiter Search Keyword Optimization
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Evidenced Keywords */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-emerald-400 block">
              Found & Evidenced Keywords ({foundKeywords.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {foundKeywords.length > 0 ? (
                foundKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-[#141419] border border-[#303038] text-slate-200 font-mono text-[11px]"
                  >
                    ✓ {kw}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">None catalogued</span>
              )}
            </div>
          </div>

          {/* Missing Keywords */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-rose-400 block">
              High-Priority Missing Keywords ({missingKeywords.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {missingKeywords.length > 0 ? (
                missingKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-rose-950/40 border border-rose-800 text-rose-300 font-mono text-[11px]"
                  >
                    +{kw}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">No missing keywords flagged</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Explicit ATS & Recruiter Filter Disclaimer */}
      <div className="p-4 rounded-xl bg-[#1C1C23] border border-[#303038] flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-[#FF7417] mt-0.5 shrink-0" />
        <div>
          <span className="font-bold text-slate-200">Recruiter Filter Advisory: </span>
          <span>
            Keyword matching simulates common recruiter search strings and ATS parsing conventions. Including these terms improves search discoverability, but should always reflect genuine hands-on expertise.
          </span>
        </div>
      </div>
    </div>
  );
};

export default RoleAlignment;
