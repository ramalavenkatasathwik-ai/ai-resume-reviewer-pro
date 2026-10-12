import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, Lightbulb } from 'lucide-react';
import { LinkedInAnalysisResult } from '@/types/linkedin';

interface KeyFindingsProps {
  result: LinkedInAnalysisResult;
}

export const KeyFindings: React.FC<KeyFindingsProps> = ({ result }) => {
  // Aggregate strengths
  const strengths: string[] = [
    ...(result.strengths || []),
    ...(result.headline_analysis?.strengths || []),
    ...(result.about_analysis?.strengths || []),
    ...(result.experience_analysis?.overall_experience_strengths || []),
  ].filter((v, idx, arr) => arr.indexOf(v) === idx).slice(0, 5);

  // Aggregate weaknesses
  const weaknesses: string[] = [
    ...(result.weaknesses || []),
    ...(result.headline_analysis?.weaknesses || []),
    ...(result.about_analysis?.weaknesses || []),
    ...(result.experience_analysis?.overall_experience_weaknesses || []),
  ].filter((v, idx, arr) => arr.indexOf(v) === idx).slice(0, 5);

  // Aggregate missing information
  const missingInfo: string[] = [
    ...(result.about_analysis?.missing_information || []),
    ...(result.experience_analysis?.missing_evidence_summary || []),
    ...(result.unavailable_sections?.map((s) => `Section unavailable: ${s.replace(/_/g, ' ')}`) || []),
  ].filter((v, idx, arr) => arr.indexOf(v) === idx).slice(0, 5);

  // Aggregate top recommendations
  const topRecommendations: string[] = [
    ...(result.overall_score?.recommended_actions || []),
    ...(result.target_role_alignment?.experience_improvement_points || []),
    ...(result.keyword_analysis?.strategic_placement_advice || []),
  ].filter((v, idx, arr) => arr.indexOf(v) === idx).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-[#FF7417]" />
          Executive Key Findings
        </h3>
        <span className="text-xs text-slate-400">
          Core audit highlights for {result.target_role}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strongest Areas */}
        <div className="bg-[#141419] rounded-xl border border-[#303038] p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Strongest Profile Areas</h4>
          </div>
          {strengths.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-300">
              {strengths.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Profile evidence was limited; no distinct standout strengths identified yet.
            </p>
          )}
        </div>

        {/* Priority Weaknesses */}
        <div className="bg-[#141419] rounded-xl border border-[#303038] p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#F04452]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Priority Areas for Improvement</h4>
          </div>
          {weaknesses.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-300">
              {weaknesses.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#F04452] font-bold shrink-0 mt-0.5">⚠</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No critical weaknesses detected in the provided sections.
            </p>
          )}
        </div>

        {/* Missing Information */}
        <div className="bg-[#141419] rounded-xl border border-[#303038] p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Missing Evidence & Omissions</h4>
          </div>
          {missingInfo.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-300">
              {missingInfo.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">
              All expected data sections were present and evidenced.
            </p>
          )}
        </div>

        {/* Top Recommendations */}
        <div className="bg-[#141419] rounded-xl border border-[#303038] p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#FF7417]">
            <Lightbulb className="w-4 h-4 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider">High-Impact Strategic Fixes</h4>
          </div>
          {topRecommendations.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-300">
              {topRecommendations.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#FF7417] font-bold shrink-0 mt-0.5">→</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Follow the 30-day action plan below for continuous optimization.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyFindings;
