import React from 'react';
import { Sparkles, ShieldAlert, Award, FolderGit2, Wrench } from 'lucide-react';
import { LinkedInAnalysisResult } from '@/types/linkedin';
import { CopyRewriteButton } from './CopyRewriteButton';

interface RewriteWorkspaceProps {
  result: LinkedInAnalysisResult;
}

export const RewriteWorkspace: React.FC<RewriteWorkspaceProps> = ({ result }) => {
  const headlineSuggestions = result.headline_analysis?.suggested_improved_headlines || [];
  const aboutRewrite =
    result.recommended_about ||
    result.about_analysis?.suggested_rewritten_about ||
    result.target_role_alignment?.suggested_about_summary;

  const experienceRewrites = (result.experience_analysis?.roles || [])
    .filter((r) => r.suggested_rewritten_description)
    .map((r) => ({
      title: r.job_title,
      company: r.organization,
      rewrite: r.suggested_rewritten_description!,
    }));

  const recommendedSkills =
    result.recommended_skills ||
    result.target_role_alignment?.recommended_keywords ||
    result.skills_analysis?.suggested_skill_prioritization ||
    [];

  const recommendedProjects =
    result.recommended_projects ||
    result.target_role_alignment?.recommended_projects ||
    [];

  const recommendedCerts =
    result.recommended_certifications ||
    result.target_role_alignment?.recommended_certifications ||
    [];

  return (
    <div className="bg-[#141419] rounded-2xl border border-[#303038] p-6 sm:p-8 space-y-7">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-[#303038]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FF7417]" />
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              AI Profile Rewrite Workspace
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Production-grade copy tailored for high-signal recruiter outreach and algorithmic indexing
          </p>
        </div>
      </div>

      {/* Mandatory Fact-Checking & Authenticity Advisory Notice */}
      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 flex items-start gap-3 text-xs text-amber-300 leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold text-amber-200">Fact-Checking & Authenticity Notice: </span>
          <span className="text-slate-300">
            Always verify that AI-suggested rewrites accurately reflect your actual hands-on experience, metrics, and technical contributions before publishing to your live LinkedIn profile. Never state false metrics or non-existent roles.
          </span>
        </div>
      </div>

      {/* 1. Headline Options */}
      {headlineSuggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              1. High-Impact Headline Variations
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              {headlineSuggestions.length} variations generated
            </span>
          </div>

          <div className="space-y-2.5">
            {headlineSuggestions.map((hl, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1C1C23] text-[#FF7417] border border-[#303038] shrink-0 mt-0.5">
                    Option {idx + 1}
                  </span>
                  <p className="font-mono text-slate-200 text-xs leading-relaxed">{hl}</p>
                </div>
                <CopyRewriteButton textToCopy={hl} label="Copy Headline" className="shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. About / Executive Summary Rewrite */}
      {aboutRewrite && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              2. Rewritten About / Executive Summary
            </h4>
            <CopyRewriteButton textToCopy={aboutRewrite} label="Copy About Summary" />
          </div>

          <div className="p-5 rounded-xl bg-[#0B0B0E] border border-[#303038] text-xs text-slate-300 font-mono whitespace-pre-line leading-relaxed">
            {aboutRewrite}
          </div>
        </div>
      )}

      {/* 3. Experience Bullet Rewrites */}
      {experienceRewrites.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            3. Metric-Driven Experience Bullet Rewrites
          </h4>

          <div className="space-y-3">
            {experienceRewrites.map((role, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2.5">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#282834]">
                  <div>
                    <span className="text-xs font-bold text-white">{role.title}</span>
                    <span className="text-xs text-[#FF7417] ml-2">@ {role.company}</span>
                  </div>
                  <CopyRewriteButton textToCopy={role.rewrite} label="Copy Bullet" />
                </div>
                <p className="text-xs font-mono text-slate-300 leading-relaxed">
                  {role.rewrite}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Strategic Additions: Skills, Projects, Certifications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Recommended Skills */}
        <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2.5">
          <div className="flex items-center gap-1.5 text-[#FF7417]">
            <Wrench className="w-3.5 h-3.5" />
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
              Recommended Skills to Add
            </h5>
          </div>
          {recommendedSkills.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-slate-300">
              {recommendedSkills.slice(0, 4).map((s, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-[#FF7417] font-bold">+</span>
                  <span className="truncate">{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">No additional skills suggested.</p>
          )}
        </div>

        {/* Recommended Projects */}
        <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2.5">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <FolderGit2 className="w-3.5 h-3.5" />
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
              Recommended Portfolio Projects
            </h5>
          </div>
          {recommendedProjects.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-slate-300">
              {recommendedProjects.slice(0, 3).map((p, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold shrink-0">→</span>
                  <span className="line-clamp-2">{p}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">No specific projects suggested.</p>
          )}
        </div>

        {/* Recommended Certifications */}
        <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2.5">
          <div className="flex items-center gap-1.5 text-sky-400">
            <Award className="w-3.5 h-3.5" />
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
              High-Signal Certifications
            </h5>
          </div>
          {recommendedCerts.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-slate-300">
              {recommendedCerts.slice(0, 3).map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-sky-400 font-bold shrink-0">★</span>
                  <span className="line-clamp-2">{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">No target certs suggested.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RewriteWorkspace;
