import React from 'react';
import { ShieldCheck, Info, CheckCircle2, Award, Target, FileSearch } from 'lucide-react';
import { LinkedInAnalysisResult } from '@/types/linkedin';

interface ProfileOverviewProps {
  result: LinkedInAnalysisResult;
}

const getScoreColor = (score?: number | null) => {
  if (score === undefined || score === null) {
    return 'text-slate-400 bg-[#1C1C23] border-[#303038]';
  }
  if (score >= 85) {
    return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/70';
  }
  if (score >= 70) {
    return 'text-amber-400 bg-amber-950/60 border-amber-800/70';
  }
  return 'text-[#F04452] bg-rose-950/60 border-rose-800/70';
};

const getScoreLabel = (score?: number | null) => {
  if (score === undefined || score === null) return 'Not available';
  if (score >= 85) return 'Exceptional Alignment';
  if (score >= 70) return 'Competitive Profile';
  if (score >= 55) return 'Needs Strategic Polish';
  return 'Requires Significant Revision';
};

export const ProfileOverview: React.FC<ProfileOverviewProps> = ({ result }) => {
  const identity = result.profile_identity || result.profile || {};
  const overallScore = result.overall_score?.score;
  const atsScore =
    result.target_role_alignment?.alignment_score ??
    result.section_scores?.target_role_alignment?.score;
  const completenessScore = result.section_scores?.profile_completeness?.score;
  const keywordScore = result.section_scores?.keyword_optimization?.score;

  const coverage = result.coverage_information || {
    coverage_percentage: result.coverage_percentage ?? 0,
    assessed_sections_count: 0,
    total_possible_sections: 10,
    calculation_methodology: 'Standard profile section evaluation.',
    limitations: [],
  };

  const limitations = result.limitations || coverage.limitations || [];

  return (
    <div className="space-y-6">
      {/* Candidate Identity & Top Metrics Hero */}
      <div className="bg-[#141419] rounded-2xl border border-[#303038] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#C91432]/10 via-[#FF7417]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 z-10 flex-1">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#1C1C23] text-[#FF7417] border border-[#303038]">
              MODE: {result.input_type?.toUpperCase() || 'URL'}
            </span>
            {result.original_filename && (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#1C1C23] text-slate-300 border border-[#303038]">
                File: {result.original_filename}
              </span>
            )}
            {result.extraction_method && (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                Extraction:{' '}
                {result.extraction_method === 'gemini_multimodal_pdf'
                  ? 'Multimodal Vision'
                  : 'Embedded PDF Text'}
              </span>
            )}
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
              Target: {result.target_role}
            </span>
            <span className="text-xs font-mono text-slate-500">
              Model: {result.model_used || 'Gemini'}
            </span>
          </div>

          {/* Name & Headline */}
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {identity.name || 'Candidate Profile'}
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-3xl font-medium leading-relaxed">
            {identity.headline || 'No headline specified in analyzed profile'}
          </p>

          {(identity.location || identity.industry) && (
            <p className="text-xs text-slate-400 flex items-center gap-2">
              {identity.location && <span>📍 {identity.location}</span>}
              {identity.location && identity.industry && <span>•</span>}
              {identity.industry && <span>🏢 {identity.industry}</span>}
            </p>
          )}
        </div>

        {/* Primary Overall Score Gauge */}
        <div className="bg-[#0B0B0E] border border-[#303038] rounded-2xl p-6 text-center min-w-[220px] shrink-0 z-10 shadow-xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Overall Profile Score
          </span>
          <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F04452] via-[#FF7417] to-[#FF9B45] my-1">
            {overallScore !== undefined && overallScore !== null ? overallScore : '—'}
            <span className="text-sm sm:text-base text-slate-500 font-normal">/100</span>
          </div>
          <p className="text-xs text-slate-300 font-semibold">
            {getScoreLabel(overallScore)}
          </p>
          {result.overall_score?.explanation && (
            <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 max-w-[200px] mx-auto leading-tight">
              {result.overall_score.explanation}
            </p>
          )}
        </div>
      </div>

      {/* 4 Score Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Overall Score */}
        <div className="bg-[#141419] rounded-xl border border-[#303038] p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#FF7417]" /> Overall Score
            </span>
            <p className="text-[11px] text-slate-500">{getScoreLabel(overallScore)}</p>
          </div>
          <span
            className={`text-base font-black px-2.5 py-1 rounded-lg border ${getScoreColor(
              overallScore
            )}`}
          >
            {overallScore !== undefined && overallScore !== null ? `${overallScore}/100` : 'Not available'}
          </span>
        </div>

        {/* 2. ATS Readiness / Role Match */}
        <div className="bg-[#141419] rounded-xl border border-[#303038] p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#F04452]" /> ATS Role Match
            </span>
            <p className="text-[11px] text-slate-500">{getScoreLabel(atsScore)}</p>
          </div>
          <span
            className={`text-base font-black px-2.5 py-1 rounded-lg border ${getScoreColor(
              atsScore
            )}`}
          >
            {atsScore !== undefined && atsScore !== null ? `${atsScore}/100` : 'Not available'}
          </span>
        </div>

        {/* 3. Profile Completeness */}
        <div className="bg-[#141419] rounded-xl border border-[#303038] p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completeness
            </span>
            <p className="text-[11px] text-slate-500">{getScoreLabel(completenessScore)}</p>
          </div>
          <span
            className={`text-base font-black px-2.5 py-1 rounded-lg border ${getScoreColor(
              completenessScore
            )}`}
          >
            {completenessScore !== undefined && completenessScore !== null
              ? `${completenessScore}/100`
              : 'Not available'}
          </span>
        </div>

        {/* 4. Keyword Optimization */}
        <div className="bg-[#141419] rounded-xl border border-[#303038] p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <FileSearch className="w-3.5 h-3.5 text-indigo-400" /> Keyword Density
            </span>
            <p className="text-[11px] text-slate-500">{getScoreLabel(keywordScore)}</p>
          </div>
          <span
            className={`text-base font-black px-2.5 py-1 rounded-lg border ${getScoreColor(
              keywordScore
            )}`}
          >
            {keywordScore !== undefined && keywordScore !== null
              ? `${keywordScore}/100`
              : 'Not available'}
          </span>
        </div>
      </div>

      {/* Profile Evidence Coverage Indicator */}
      <div className="bg-[#141419] rounded-2xl border border-[#303038] p-6 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#FF7417]" />
            <h3 className="text-sm font-bold text-white">
              Profile Evidence Coverage: {coverage.coverage_percentage}%
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {coverage.assessed_sections_count} of {coverage.total_possible_sections} standard sections evaluated
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#0B0B0E] h-2.5 rounded-full overflow-hidden border border-[#303038]">
          <div
            className="bg-gradient-to-r from-[#C91432] via-[#F04452] to-[#FF7417] h-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, coverage.coverage_percentage))}%` }}
          />
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {coverage.calculation_methodology ||
            'Coverage reflects verifiable sections provided in the analyzed input. Missing sections receive zero credit rather than simulated estimates.'}
        </p>

        {limitations.length > 0 && (
          <div className="mt-3 p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Note on Access Limitations:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
              {limitations.map((lim, idx) => (
                <li key={idx}>{lim}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileOverview;
