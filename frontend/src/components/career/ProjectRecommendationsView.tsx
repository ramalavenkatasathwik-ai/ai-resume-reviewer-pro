import React from 'react';
import {
  FolderGit2,
  Code2,
  CheckCircle,
  FileCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ProjectRecommendationItem } from '@/types/careerIntelligence';

interface ProjectRecommendationsViewProps {
  projects: ProjectRecommendationItem[];
  targetRole: string;
}

export const ProjectRecommendationsView: React.FC<ProjectRecommendationsViewProps> = ({
  projects,
  targetRole,
}) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#141419] to-[#1B1B22] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FF7417]/20 text-[#FF9B45] border border-[#FF7417]/30">
              Practical Portfolio Blueprints
            </span>
            <span className="text-xs text-[#A1A1AA]">Target Role: {targetRole}</span>
          </div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-[#FF7417]" />
            Recommended Hands-On Showcase Projects
          </h2>
          <p className="text-xs text-zinc-300 mt-2 max-w-3xl leading-relaxed">
            Real-world project proposals engineered to demonstrate core competencies and bridge evidenced skill gaps.
          </p>
        </div>
      </div>

      {/* Strict Guardrail Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-300 text-xs">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block mb-0.5">Strict Factual Guardrail</span>
          These projects are <strong>PROPOSED</strong> blueprints designed for your active development.
          In accordance with professional standards, do not document them on your resume as completed work until
          you have built, tested, and published the code.
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-6">
        {projects.map((proj, idx) => (
          <div
            key={proj.id || idx}
            className="p-6 rounded-3xl bg-[#141419] border border-white/5 space-y-6 hover:border-white/10 transition"
          >
            {/* Project Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#FF7417]/20 text-[#FF9B45] uppercase tracking-wider">
                    Proposed Project {idx + 1}
                  </span>
                  <span className="text-xs text-[#A1A1AA]">{proj.target_role}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{proj.title}</h3>
              </div>

              {/* Tech Stack Chips */}
              <div className="flex flex-wrap gap-1.5 self-start sm:self-auto">
                {proj.tech_stack.map((tech, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#1B1B22] text-zinc-200 border border-white/5"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Problem Statement */}
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Problem Statement
              </span>
              <p className="text-sm text-zinc-300 leading-relaxed">{proj.problem_statement}</p>
            </div>

            {/* Core Features & Milestones Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Core Features */}
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-[#FF7417]" />
                  Key Functional Features
                </span>
                <ul className="space-y-2">
                  {proj.core_features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-xs text-zinc-300">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Implementation Milestones */}
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Structured Build Milestones
                </span>
                <div className="space-y-2">
                  {proj.milestones.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      className="p-2.5 rounded-xl bg-[#1B1B22] border border-white/5 text-xs"
                    >
                      <span className="font-semibold text-white block mb-0.5">{m.phase}</span>
                      <span className="text-zinc-400 text-[11px]">{m.deliverable}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Deliverables & Resume Documentation Guide */}
            <div className="p-4 rounded-2xl bg-[#1B1B22] border border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Resume Documentation Guide (Post-Completion)
              </div>
              <p className="text-[11px] text-zinc-400">
                Once this project is live and verified on your public GitHub, use these battle-tested bullet points:
              </p>
              <div className="space-y-2 pt-1">
                {proj.resume_documentation_guide.map((bullet, bIdx) => (
                  <div
                    key={bIdx}
                    className="p-2.5 rounded-xl bg-[#0B0B0E] border border-white/5 text-xs text-zinc-200 flex items-start gap-2"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-[#FF7417] flex-shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
