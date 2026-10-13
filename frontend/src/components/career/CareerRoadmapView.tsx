import React, { useState } from 'react';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  FolderGit2,
  Award,
  Calendar,
  ShieldAlert,
  Save,
  Check,
  Sparkles,
} from 'lucide-react';
import { CareerRoadmapResponse } from '@/types/careerIntelligence';
import { careerIntelligenceService } from '@/services/careerIntelligenceService';

interface CareerRoadmapViewProps {
  roadmap: CareerRoadmapResponse;
  onSaved?: (saved: CareerRoadmapResponse) => void;
}

export const CareerRoadmapView: React.FC<CareerRoadmapViewProps> = ({
  roadmap,
  onSaved,
}) => {
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await careerIntelligenceService.saveRoadmap(roadmap);
      setSavedSuccess(true);
      if (onSaved) onSaved(res);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: { message?: string } } } };
      setSaveError(e.response?.data?.detail?.message || 'Failed to save roadmap.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#141419] to-[#1B1B22] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FF7417]/20 text-[#FF9B45] border border-[#FF7417]/30">
              Personalized Career Roadmap
            </span>
            <span className="text-xs text-[#A1A1AA]">
              {roadmap.current_level || 'Mid-Level'} → {roadmap.target_level || roadmap.target_role}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#FF7417]" />
            Career Progression Plan: {roadmap.target_role}
          </h2>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#C91432] to-[#FF7417] text-white hover:opacity-90 transition shadow-lg shadow-[#C91432]/20 flex items-center gap-2 self-start md:self-auto disabled:opacity-50"
        >
          {saving ? (
            <>Saving...</>
          ) : savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              Roadmap Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Roadmap to Account
            </>
          )}
        </button>
      </div>

      {saveError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {saveError}
        </div>
      )}

      {/* Disclaimers Guardrail */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-300 text-xs">
        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block mb-0.5">Career Guidance Notice</span>
          {roadmap.disclaimer ||
            'AI career guidance recommendations do not guarantee employment, interviews, or specific salary outcomes.'}
        </div>
      </div>

      {/* Grid: Strengths vs Skill Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verified Strengths */}
        <div className="p-6 rounded-2xl bg-[#141419] border border-white/5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Verified Current Strengths ({roadmap.strengths.length})
          </h3>
          <p className="text-xs text-[#A1A1AA]">
            Competencies directly evidenced in your existing resume profile.
          </p>

          <div className="space-y-2.5">
            {roadmap.strengths.map((str, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-[#1B1B22] border border-white/5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{str.skill}</span>
                  {str.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {str.category}
                    </span>
                  )}
                </div>
                {str.evidence && <p className="text-[11px] text-zinc-400">{str.evidence}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Evidenced Skill Gaps */}
        <div className="p-6 rounded-2xl bg-[#141419] border border-white/5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            Evidenced Skill Gaps ({roadmap.skill_gaps.length})
          </h3>
          <p className="text-xs text-[#A1A1AA]">
            Critical skills required for {roadmap.target_role} not yet evidenced in your profile.
          </p>

          <div className="space-y-2.5">
            {roadmap.skill_gaps.map((gap, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-[#1B1B22] border border-white/5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{gap.skill}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                      gap.priority === 'high'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {(gap.priority || 'medium').toUpperCase()} PRIORITY
                  </span>
                </div>
                {gap.reason && <p className="text-[11px] text-zinc-400">{gap.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Potential Undocumented Skills */}
      {roadmap.potential_undocumented_skills &&
        roadmap.potential_undocumented_skills.length > 0 && (
          <div className="p-6 rounded-2xl bg-[#141419] border border-white/5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF7417]" />
              Potential Undocumented Skills
            </h3>
            <p className="text-xs text-[#A1A1AA]">
              Skills you likely possess based on your background that could be made explicit in your resume.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {roadmap.potential_undocumented_skills.map((undoc, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[#1B1B22] border border-white/5 flex items-start gap-2.5 text-xs"
                >
                  <MapPin className="w-4 h-4 text-[#FF7417] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">{undoc.skill}</span>
                    <span className="text-zinc-400 text-[11px]">{undoc.recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Priority Learning Topics */}
      <div className="p-6 rounded-2xl bg-[#141419] border border-white/5 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#FF7417]" />
          Priority Learning Topics ({roadmap.learning_topics.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roadmap.learning_topics.map((topic, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[#1B1B22] border border-white/5 flex flex-col justify-between space-y-2"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-white">{topic.topic}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                    ~{topic.estimated_weeks} Weeks
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-2">{topic.reason}</p>
              </div>
              <div className="pt-2 border-t border-white/5 text-[11px] text-zinc-300">
                <span className="font-semibold text-[#FF9B45]">Objective: </span>
                {topic.learning_objective}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones: Short-term & Medium-term */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Short Term */}
        <div className="p-6 rounded-2xl bg-[#141419] border border-white/5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#FF7417]" />
            Short-Term Milestones (0 - 90 Days)
          </h3>
          <div className="space-y-3">
            {roadmap.short_term_milestones.map((ms, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-[#1B1B22] border border-white/5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#FF9B45]">
                    {ms.timeframe}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase">{ms.priority}</span>
                </div>
                <h4 className="text-xs font-bold text-white">{ms.title}</h4>
                <p className="text-[11px] text-zinc-400">{ms.completion_criteria}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Medium Term */}
        <div className="p-6 rounded-2xl bg-[#141419] border border-white/5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Medium-Term Milestones (3 - 12 Months)
          </h3>
          <div className="space-y-3">
            {roadmap.medium_term_milestones.map((ms, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-[#1B1B22] border border-white/5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-emerald-400">
                    {ms.timeframe}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase">{ms.priority}</span>
                </div>
                <h4 className="text-xs font-bold text-white">{ms.title}</h4>
                <p className="text-[11px] text-zinc-400">{ms.completion_criteria}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Certifications & Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recommended Certifications */}
        {roadmap.certifications && roadmap.certifications.length > 0 && (
          <div className="p-6 rounded-2xl bg-[#141419] border border-white/5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Recognized Industry Certifications
            </h3>
            <div className="space-y-2">
              {roadmap.certifications.map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#1B1B22] border border-white/5 text-xs">
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span>{c.name}</span>
                    <span className="text-[10px] text-zinc-400">{c.issuer}</span>
                  </div>
                  {c.relevance && <p className="text-[11px] text-zinc-400 mt-1">{c.relevance}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Improvements */}
        {roadmap.portfolio_improvements && roadmap.portfolio_improvements.length > 0 && (
          <div className="p-6 rounded-2xl bg-[#141419] border border-white/5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-purple-400" />
              Portfolio & Profile Improvements
            </h3>
            <div className="space-y-2">
              {roadmap.portfolio_improvements.map((p, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#1B1B22] border border-white/5 text-xs">
                  <span className="font-semibold text-white block mb-0.5">{p.area}</span>
                  <span className="text-[11px] text-zinc-400">{p.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
