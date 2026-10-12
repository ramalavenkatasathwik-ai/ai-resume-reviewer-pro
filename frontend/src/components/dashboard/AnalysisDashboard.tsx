import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { LinkedInAnalysisResult } from '@/types/linkedin';
import { ProfileOverview } from './ProfileOverview';
import { KeyFindings } from './KeyFindings';
import { SectionAnalysisList } from './SectionAnalysisList';
import { RoleAlignment } from './RoleAlignment';
import { RewriteWorkspace } from './RewriteWorkspace';
import { CareerActionPlan } from './CareerActionPlan';
import { ReportActions } from './ReportActions';

export interface AnalysisDashboardProps {
  result: LinkedInAnalysisResult;
  onNewAnalysis?: () => void;
  className?: string;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  result,
  onNewAnalysis,
  className = '',
}) => {
  return (
    <div className={`space-y-10 animate-fade-in print:text-black ${className}`}>
      {/* Top Action Bar for Results View */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#303038] no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C91432] to-[#FF7417] flex items-center justify-center text-white font-bold shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              Analysis Results Dashboard
            </h2>
            <p className="text-xs text-slate-400">
              Generated via BYOK Google Gemini Intelligence • Targeted for <strong className="text-slate-200">{result.target_role}</strong>
            </p>
          </div>
        </div>

        {/* Print, Email (disabled), and New Analysis Actions */}
        <ReportActions onNewAnalysis={onNewAnalysis} />
      </div>

      {/* Section 1: Candidate Identity, Scores, and Profile Evidence Coverage */}
      <section aria-label="Profile Overview and Coverage">
        <ProfileOverview result={result} />
      </section>

      {/* Section 2: Executive Key Findings */}
      <section aria-label="Key Findings">
        <KeyFindings result={result} />
      </section>

      {/* Section 3: Target Role Alignment Benchmark */}
      <section aria-label="Target Role Alignment">
        <RoleAlignment result={result} />
      </section>

      {/* Section 4: Comprehensive Section-by-Section Analysis */}
      <section aria-label="Section Breakdown and Details">
        <SectionAnalysisList result={result} />
      </section>

      {/* Section 5: AI Profile Rewrite Workspace */}
      <section aria-label="AI Rewrite Workspace">
        <RewriteWorkspace result={result} />
      </section>

      {/* Section 6: Prioritized 30-Day Profile Improvement Plan */}
      <section aria-label="Career Action Plan">
        <CareerActionPlan result={result} />
      </section>

      {/* Advisory Disclaimer Notice & Ethical Compliance Banner */}
      <section aria-label="Advisory Disclaimer">
        <div className="p-5 rounded-2xl bg-[#141419] border border-[#303038] text-xs text-slate-400 leading-relaxed space-y-2">
          <div className="flex items-center gap-2 text-slate-300 font-bold">
            <ShieldCheck className="w-4 h-4 text-[#FF7417]" />
            <span>Advisory Evaluation & Compliance Notice</span>
          </div>
          <p>{result.disclaimer}</p>
          <p className="text-slate-500 text-[11px] pt-1 border-t border-[#282834]">
            AI Resume Reviewer Pro strictly processes candidate inputs through direct client-authorized BYOK requests. Profile evaluations are probabilistic machine-learning recommendations designed for career preparation and should not be construed as employment guarantees.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AnalysisDashboard;
