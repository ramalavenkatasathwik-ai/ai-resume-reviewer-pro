import React from 'react';
import {
  Layers,
  Sparkles,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  Award,
  Search,
  TrendingUp,
} from 'lucide-react';
import { LinkedInAnalysisResult } from '@/types/linkedin';
import { SectionAnalysisCard } from './SectionAnalysisCard';

interface SectionAnalysisListProps {
  result: LinkedInAnalysisResult;
}

export const SectionAnalysisList: React.FC<SectionAnalysisListProps> = ({ result }) => {
  const sectionScores = result.section_scores || {};
  const projectsData = result.project_analysis || result.projects_analysis;
  const additional = result.additional_sections;

  return (
    <div className="space-y-8">
      {/* 10 Section Scores Grid Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#FF7417]" />
            Section Score Breakdown (0 - 100)
          </h3>
          <span className="text-xs text-slate-400">
            Advisory evaluation across 10 LinkedIn dimensions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {Object.entries(sectionScores).map(([key, val]) => (
            <div
              key={key}
              className="bg-[#141419] rounded-xl border border-[#303038] p-4 flex flex-col justify-between hover:border-slate-500/50 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold capitalize text-slate-300 truncate">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-md font-mono shrink-0 ${
                      val.score >= 85
                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                        : val.score >= 70
                        ? 'bg-amber-950/70 text-amber-400 border border-amber-800'
                        : 'bg-rose-950/70 text-[#F04452] border border-rose-800'
                    }`}
                  >
                    {val.score}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {val.explanation}
                </p>
              </div>

              {val.recommended_actions?.[0] && (
                <p className="text-[10px] text-[#FF9B45] mt-3 pt-2 border-t border-[#282834] font-medium line-clamp-2">
                  💡 {val.recommended_actions[0]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Section Accordions */}
      <div className="space-y-4">
        {/* 1. Headline & Positioning */}
        <SectionAnalysisCard
          id="headline"
          title="Headline & Identity Positioning"
          subtitle="Keywords, value proposition, and recruiter search visibility"
          score={sectionScores.headline?.score}
          icon={<Sparkles className="w-4 h-4 text-[#FF7417]" />}
          supportingEvidence={sectionScores.headline?.supporting_evidence}
          recommendedAction={sectionScores.headline?.recommended_actions?.[0]}
        >
          <div className="space-y-5 text-xs text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2">
                <p className="font-bold text-slate-200">Clarity & Value Proposition</p>
                <p className="leading-relaxed">
                  {result.headline_analysis?.clarity_and_specificity || 'Standard clarity.'}
                </p>
                <p className="text-slate-400 mt-2 font-medium">
                  {result.headline_analysis?.value_proposition}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2">
                <p className="font-bold text-slate-200">Role Alignment & Keywords</p>
                <p className="leading-relaxed">
                  {result.headline_analysis?.target_role_alignment}
                </p>
                {result.headline_analysis?.relevant_keywords && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {result.headline_analysis.relevant_keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-[#1C1C23] text-[#FF7417] font-mono text-[10px] border border-[#303038]"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Headline Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.headline_analysis?.strengths && result.headline_analysis.strengths.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1.5">
                  <p className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                    Headline Strengths
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {result.headline_analysis.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.headline_analysis?.weaknesses && result.headline_analysis.weaknesses.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1.5">
                  <p className="font-bold text-[#F04452] uppercase tracking-wider text-[11px]">
                    Headline Weaknesses
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {result.headline_analysis.weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </SectionAnalysisCard>

        {/* 2. About Section & Narrative */}
        <SectionAnalysisCard
          id="about"
          title="About Section & Narrative Impact"
          subtitle="Career story, quantifiable metrics, and impact assessments"
          score={sectionScores.about?.score}
          isAvailable={result.about_analysis?.is_available ?? true}
          icon={<FileText className="w-4 h-4 text-[#F04452]" />}
          supportingEvidence={sectionScores.about?.supporting_evidence}
          recommendedAction={sectionScores.about?.recommended_actions?.[0]}
        >
          <div className="space-y-5 text-xs text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2">
                <p className="font-bold text-slate-200">Career Narrative & Identity</p>
                <p className="leading-relaxed">
                  {result.about_analysis?.career_narrative ||
                    result.about_analysis?.introduction_and_identity ||
                    'No career narrative was observed.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2">
                <p className="font-bold text-slate-200">Impact & Missing Information</p>
                <p className="leading-relaxed">
                  {result.about_analysis?.evidence_of_impact || 'Impact statements are lacking.'}
                </p>
                {result.about_analysis?.missing_information &&
                  result.about_analysis.missing_information.length > 0 && (
                    <ul className="list-disc list-inside text-rose-300 mt-2 space-y-0.5">
                      {result.about_analysis.missing_information.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  )}
              </div>
            </div>

            {/* About Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.about_analysis?.strengths && result.about_analysis.strengths.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1.5">
                  <p className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                    About Strengths
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {result.about_analysis.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.about_analysis?.weaknesses && result.about_analysis.weaknesses.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1.5">
                  <p className="font-bold text-[#F04452] uppercase tracking-wider text-[11px]">
                    About Weaknesses
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {result.about_analysis.weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </SectionAnalysisCard>

        {/* 3. Work Experience Breakdown */}
        <SectionAnalysisCard
          id="experience"
          title="Experience & Role Achievements"
          subtitle={`${result.experience_analysis?.roles_analyzed_count || 0} roles analyzed with quantifiable outcome assessments`}
          score={sectionScores.experience?.score}
          isAvailable={result.experience_analysis?.is_available ?? true}
          icon={<Briefcase className="w-4 h-4 text-emerald-400" />}
          supportingEvidence={sectionScores.experience?.supporting_evidence}
          recommendedAction={sectionScores.experience?.recommended_actions?.[0]}
        >
          <div className="space-y-6 text-xs text-slate-300">
            {result.experience_analysis?.roles && result.experience_analysis.roles.length > 0 ? (
              result.experience_analysis.roles.map((role, idx) => (
                <div key={idx} className="p-5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-3 border-b border-[#303038]">
                    <div>
                      <h5 className="text-sm font-bold text-white">{role.job_title}</h5>
                      <p className="text-xs text-[#FF7417] font-semibold">{role.organization}</p>
                    </div>
                    {role.dates && (
                      <span className="text-[11px] font-mono text-slate-400">{role.dates}</span>
                    )}
                  </div>

                  {role.responsibilities && role.responsibilities.length > 0 && (
                    <div>
                      <p className="font-bold text-slate-300 text-[11px] uppercase tracking-wider mb-1">
                        Responsibilities
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-400">
                        {role.responsibilities.map((resp, i) => (
                          <li key={i}>{resp}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {role.achievements && role.achievements.length > 0 && (
                    <div>
                      <p className="font-bold text-slate-300 text-[11px] uppercase tracking-wider mb-1">
                        Evidenced Achievements
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {role.achievements.map((ach, i) => (
                          <li key={i}>{ach}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {role.quantifiable_outcomes && role.quantifiable_outcomes.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {role.quantifiable_outcomes.map((out, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-[11px] font-mono flex items-center gap-1.5"
                        >
                          <TrendingUp className="w-3 h-3 text-emerald-400" /> {out}
                        </span>
                      ))}
                    </div>
                  )}

                  {role.relevant_skills && role.relevant_skills.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] font-mono text-slate-400 block mb-1">
                        Evidenced Skills:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {role.relevant_skills.map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-[#1C1C23] text-slate-300 font-mono text-[10px] border border-[#303038]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">
                No individual work experience roles detected in the evaluated profile.
              </p>
            )}
          </div>
        </SectionAnalysisCard>

        {/* 4. Education */}
        <SectionAnalysisCard
          id="education"
          title="Education & Academic Qualifications"
          subtitle="Institutions, degrees, fields of study, and target-role relevance"
          score={sectionScores.education?.score}
          isAvailable={result.education_analysis?.is_available ?? true}
          icon={<GraduationCap className="w-4 h-4 text-sky-400" />}
          supportingEvidence={sectionScores.education?.supporting_evidence}
          recommendedAction={sectionScores.education?.recommended_actions?.[0]}
        >
          <div className="space-y-4 text-xs text-slate-300">
            {result.education_analysis?.items && result.education_analysis.items.length > 0 ? (
              result.education_analysis.items.map((edu, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <h5 className="text-sm font-bold text-white">{edu.institution}</h5>
                    {edu.dates && (
                      <span className="text-[11px] font-mono text-slate-400">{edu.dates}</span>
                    )}
                  </div>
                  {(edu.degree || edu.field_of_study) && (
                    <p className="text-xs text-slate-300 font-medium">
                      {edu.degree} {edu.degree && edu.field_of_study ? 'in' : ''} {edu.field_of_study}
                    </p>
                  )}
                  {edu.relevance_to_target_role && (
                    <p className="text-slate-400 text-[11px]">
                      <span className="font-semibold text-slate-300">Target Role Relevance: </span>
                      {edu.relevance_to_target_role}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">
                No explicit academic records detected or provided in this profile.
              </p>
            )}
          </div>
        </SectionAnalysisCard>

        {/* 5. Skills Matrix */}
        <SectionAnalysisCard
          id="skills"
          title="Skills Matrix & Keyword Search Optimization"
          subtitle="Demonstrated competencies, missing target skills, and recruiter search filters"
          score={sectionScores.skills?.score}
          isAvailable={result.skills_analysis?.is_available ?? true}
          icon={<Wrench className="w-4 h-4 text-indigo-400" />}
          supportingEvidence={sectionScores.skills?.supporting_evidence}
          recommendedAction={sectionScores.skills?.recommended_actions?.[0]}
        >
          <div className="space-y-5 text-xs text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-3">
                <p className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                  ✓ Role-Relevant & Evidenced Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.skills_analysis?.role_relevant_skills &&
                  result.skills_analysis.role_relevant_skills.length > 0 ? (
                    result.skills_analysis.role_relevant_skills.map((s, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded bg-[#1C1C23] text-slate-200 border border-[#303038] font-mono text-[11px]"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic text-xs">None identified</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-3">
                <p className="font-bold text-rose-400 uppercase tracking-wider text-[11px]">
                  ⚠ Missing / Weakly Evidenced Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.skills_analysis?.missing_or_weakly_evidenced_skills &&
                  result.skills_analysis.missing_or_weakly_evidenced_skills.length > 0 ? (
                    result.skills_analysis.missing_or_weakly_evidenced_skills.map((s, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded bg-rose-950/40 border border-rose-800 text-rose-300 font-mono text-[11px]"
                      >
                        +{s}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic text-xs">No missing skills flagged</span>
                  )}
                </div>
              </div>
            </div>

            {result.skills_analysis?.suggested_skill_prioritization &&
              result.skills_analysis.suggested_skill_prioritization.length > 0 && (
                <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2">
                  <p className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                    Recommended Top 3-5 Skills to Pin to Profile Header
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.skills_analysis.suggested_skill_prioritization.map((s, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-lg bg-[#1C1C23] text-[#FF7417] border border-[#FF7417]/30 font-semibold text-xs"
                      >
                        ★ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </SectionAnalysisCard>

        {/* 6. Projects */}
        <SectionAnalysisCard
          id="projects"
          title="Projects & Technical Implementations"
          subtitle="Hands-on portfolio, technical stack, and problem/solution narratives"
          score={sectionScores.projects?.score}
          isAvailable={projectsData?.is_available ?? false}
          icon={<FolderGit2 className="w-4 h-4 text-violet-400" />}
          supportingEvidence={sectionScores.projects?.supporting_evidence}
          recommendedAction={sectionScores.projects?.recommended_actions?.[0]}
        >
          <div className="space-y-4 text-xs text-slate-300">
            {projectsData?.items && projectsData.items.length > 0 ? (
              projectsData.items.map((proj, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2.5">
                  <h5 className="text-sm font-bold text-white">{proj.title}</h5>
                  {proj.technical_stack && proj.technical_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {proj.technical_stack.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-[#1C1C23] text-slate-300 font-mono text-[10px] border border-[#303038]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {proj.problem_and_solution && (
                    <p className="text-slate-300 leading-relaxed">{proj.problem_and_solution}</p>
                  )}
                  {proj.outcomes_and_impact && (
                    <p className="text-emerald-300 font-mono text-[11px]">
                      Impact: {proj.outcomes_and_impact}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">
                No discrete technical projects were identified in this profile. Consider creating project entries for key repositories.
              </p>
            )}
          </div>
        </SectionAnalysisCard>

        {/* 7. Certifications & Additional Sections */}
        <SectionAnalysisCard
          id="certifications"
          title="Certifications, Courses & Additional Sections"
          subtitle="Accreditations, publications, awards, and language proficiencies"
          score={sectionScores.certifications?.score}
          icon={<Award className="w-4 h-4 text-amber-400" />}
          supportingEvidence={sectionScores.certifications?.supporting_evidence}
          recommendedAction={sectionScores.certifications?.recommended_actions?.[0]}
        >
          <div className="space-y-4 text-xs text-slate-300">
            {/* Certifications List */}
            {((additional?.certifications && additional.certifications.length > 0) ||
              (result.certifications_analysis && result.certifications_analysis.length > 0)) ? (
              <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2">
                <p className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Verified Certifications
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {(additional?.certifications || result.certifications_analysis || []).map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No industry certifications detected in the provided input.
              </p>
            )}

            {/* Other Additional Sections if any */}
            {additional && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {additional.courses && additional.courses.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1">
                    <p className="font-bold text-slate-300 text-[11px]">Courses & Specializations</p>
                    <p className="text-slate-400 text-[11px]">{additional.courses.join(', ')}</p>
                  </div>
                )}
                {additional.publications && additional.publications.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1">
                    <p className="font-bold text-slate-300 text-[11px]">Publications</p>
                    <p className="text-slate-400 text-[11px]">{additional.publications.join('; ')}</p>
                  </div>
                )}
                {additional.languages && additional.languages.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1">
                    <p className="font-bold text-slate-300 text-[11px]">Languages</p>
                    <p className="text-slate-400 text-[11px]">{additional.languages.join(', ')}</p>
                  </div>
                )}
                {additional.honors_and_awards && additional.honors_and_awards.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1">
                    <p className="font-bold text-slate-300 text-[11px]">Honors & Awards</p>
                    <p className="text-slate-400 text-[11px]">{additional.honors_and_awards.join(', ')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionAnalysisCard>

        {/* 8. Keyword Optimization */}
        <SectionAnalysisCard
          id="keywords"
          title="Keyword Search Visibility & Placement"
          subtitle="Recruiter Boolean search density and target job alignment"
          score={sectionScores.keyword_optimization?.score}
          icon={<Search className="w-4 h-4 text-[#FF7417]" />}
          supportingEvidence={sectionScores.keyword_optimization?.supporting_evidence}
          recommendedAction={sectionScores.keyword_optimization?.recommended_actions?.[0]}
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2">
              <p className="font-bold text-slate-200">Density Assessment</p>
              <p className="leading-relaxed">
                {result.keyword_analysis?.keyword_density_assessment || 'Standard keyword density.'}
              </p>
            </div>

            {result.keyword_analysis?.strategic_placement_advice &&
              result.keyword_analysis.strategic_placement_advice.length > 0 && (
                <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2">
                  <p className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                    Strategic Keyword Placement Advice
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {result.keyword_analysis.strategic_placement_advice.map((adv, i) => (
                      <li key={i}>{adv}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </SectionAnalysisCard>
      </div>
    </div>
  );
};

export default SectionAnalysisList;
