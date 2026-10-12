import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Target,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Award,
  FileCheck2,
  AlignLeft,
  User,
  Mail,
  MapPin,
} from 'lucide-react';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { ApiKeyInput } from '@/components/ui/ApiKeyInput';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { ScoreCard } from '@/components/ui/ScoreCard';
import { SectionAccordion } from '@/components/ui/SectionAccordion';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ReportActions } from '@/components/ui/ReportActions';
import { Toast } from '@/components/ui/Toast';
import { ResumeAnalysisResult } from '@/types/api';
import { resumeService } from '@/services/resumeService';
import { linkedinService } from '@/services/linkedinService';

const PRESET_ROLES = [
  'Senior Software Engineer',
  'Full Stack Developer',
  'Product Manager',
  'Data Scientist',
  'DevOps Engineer',
  'Cloud Solutions Architect',
];

export const DashboardPage: React.FC = () => {
  // Inputs state
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState<string>('Senior Software Engineer');
  const [customRoleMode, setCustomRoleMode] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState<string[]>([
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ]);

  // Execution state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load supported models on mount
  useEffect(() => {
    linkedinService
      .getSupportedModels()
      .then((data) => {
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
          if (!selectedModel || !data.models.includes(selectedModel)) {
            setSelectedModel(data.default_model || data.models[0]);
          }
        }
      })
      .catch(() => {
        // Fallback default models already in state
      });
  }, []);

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    try {
      localStorage.setItem('gemini_api_key', key);
    } catch {
      // ignore
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    try {
      localStorage.setItem('gemini_model', model);
    } catch {
      // ignore
    }
  };

  const handleAnalyze = async () => {
    setError(null);

    if (!file) {
      setError('Please upload a resume PDF file to analyze.');
      return;
    }

    if (!apiKey || apiKey.trim().length === 0) {
      setError('Please enter your Google Gemini API key to run the analysis.');
      return;
    }

    if (!targetRole || targetRole.trim().length === 0) {
      setError('Please specify a target role to benchmark your resume against.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await resumeService.analyzeResume(
        file,
        targetRole.trim(),
        apiKey.trim(),
        selectedModel
      );
      setResult(data);
      setToastMessage('Resume analyzed successfully!');
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to analyze resume. Please check your API key and file format.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    if (!result) return;
    const summaryText = `AI RESUME EVALUATION: ${result.target_role}
Overall Score: ${result.overall_score}/100 | ATS Score: ${result.ats_score}/100

EXECUTIVE SUMMARY:
${result.professional_summary}

KEY STRENGTHS:
${result.strengths.map((s) => `• ${s}`).join('\n')}

AREAS FOR IMPROVEMENT:
${result.weaknesses.map((w) => `• ${w}`).join('\n')}

MISSING SKILLS:
${result.missing_skills.map((m) => `• ${m}`).join('\n')}`;

    navigator.clipboard.writeText(summaryText);
    setToastMessage('Analysis summary copied to clipboard!');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#303038]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#C91432]/15 text-[#F04452] border border-[#C91432]/30 uppercase font-mono">
              ATS Benchmark Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F7F7FA] tracking-tight">
            Resume Analyzer
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Evaluate your PDF resume against target job requirements, optimize ATS keyword matching, and prepare for interviews.
          </p>
        </div>

        {result && (
          <div className="flex items-center gap-3">
            <SecondaryButton onClick={handleReset} size="sm">
              New Analysis
            </SecondaryButton>
            <PrimaryButton onClick={handlePrint} variant="crimson" size="sm">
              Export PDF
            </PrimaryButton>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          message={error}
          onRetry={handleAnalyze}
          onDismiss={() => setError(null)}
        />
      )}

      {/* 2-Column Responsive Layout: Left Input Panel, Right Results Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Configuration & Upload (5 cols on wide screens) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 1: Upload Dropzone */}
          <div className="p-5 rounded-2xl bg-[#141419] border border-[#303038] space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[#F7F7FA] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#C91432] text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                Upload Resume PDF
              </label>
              <span className="text-[11px] font-mono text-[#A1A1AA]">PDF only, max 10MB</span>
            </div>

            <FileDropzone
              file={file}
              onFileSelect={setFile}
              onFileRemove={() => setFile(null)}
              disabled={isLoading}
            />
          </div>

          {/* Step 2: Target Role Selection */}
          <div className="p-5 rounded-2xl bg-[#141419] border border-[#303038] space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[#F7F7FA] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#FF7417] text-[#0B0B0E] flex items-center justify-center text-xs font-bold">
                  2
                </span>
                Target Role
              </label>
              <button
                type="button"
                onClick={() => setCustomRoleMode(!customRoleMode)}
                className="text-xs text-[#FF7417] hover:underline"
              >
                {customRoleMode ? 'Select preset' : 'Enter custom role'}
              </button>
            </div>

            {!customRoleMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setTargetRole(role)}
                    className={`p-2.5 rounded-xl text-left text-xs font-medium border transition-all ${
                      targetRole === role
                        ? 'bg-[#C91432]/15 border-[#C91432] text-[#F7F7FA] font-semibold'
                        : 'bg-[#1C1C23] border-[#303038] text-[#A1A1AA] hover:text-[#F7F7FA] hover:border-[#FF7417]/50'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Staff AI Research Engineer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C23] border border-[#303038] text-[#F7F7FA] placeholder-[#A1A1AA]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7417]"
                />
              </div>
            )}
          </div>

          {/* Step 3: BYOK Gemini Key & Model Selector */}
          <div className="p-5 rounded-2xl bg-[#141419] border border-[#303038] space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[#F7F7FA] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1C1C23] border border-[#303038] text-[#FF7417] flex items-center justify-center text-xs font-bold">
                  3
                </span>
                Gemini BYOK Engine
              </label>
              <span className="text-[11px] text-[#A1A1AA]">Zero server storage</span>
            </div>

            <ApiKeyInput
              value={apiKey}
              onChange={handleApiKeyChange}
              selectedModel={selectedModel}
            />

            <ModelSelector
              models={availableModels}
              selectedModel={selectedModel}
              onChange={handleModelChange}
              disabled={isLoading}
            />
          </div>

          {/* Action Button */}
          <div>
            <PrimaryButton
              variant="crimson"
              size="lg"
              onClick={handleAnalyze}
              isLoading={isLoading}
              disabled={!file || !apiKey}
              className="w-full justify-center shadow-lg shadow-[#C91432]/25"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>{isLoading ? 'Analyzing Resume...' : 'Analyze Resume'}</span>
            </PrimaryButton>

            {!apiKey && (
              <p className="mt-2 text-center text-[11px] text-amber-400">
                Please provide your Google Gemini API key above to initiate analysis.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Results or Empty State (7 cols on wide screens) */}
        <div className="lg:col-span-7">
          {isLoading ? (
            <div className="p-6 rounded-2xl bg-[#141419] border border-[#303038] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[#303038]">
                <div className="w-8 h-8 rounded-lg bg-[#FF7417]/20 flex items-center justify-center text-[#FF7417] animate-pulse">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F7F7FA]">
                    Evaluating Resume with Gemini...
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Parsing PDF text, extracting entities, calculating ATS alignment score
                  </p>
                </div>
              </div>
              <LoadingSkeleton count={5} />
            </div>
          ) : !result ? (
            <EmptyState
              title="No Resume Analyzed Yet"
              description="Upload your resume PDF on the left and click 'Analyze Resume' to generate a full ATS score report, bullet improvements, and interview questions."
              icon={FileText}
            />
          ) : (
            /* Analysis Results Report */
            <div id="printable-report" className="space-y-6">
              {/* Report Header Card */}
              <div className="p-6 rounded-2xl bg-[#141419] border border-[#303038] relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#FF7417]">
                      Benchmarked Against
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-[#F7F7FA] mt-1">
                      {result.target_role}
                    </h2>

                    {result.candidate_information && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#A1A1AA]">
                        {result.candidate_information.name && (
                          <span className="flex items-center gap-1 font-semibold text-[#F7F7FA]">
                            <User className="w-3.5 h-3.5 text-[#FF7417]" />
                            {result.candidate_information.name}
                          </span>
                        )}
                        {result.candidate_information.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {result.candidate_information.email}
                          </span>
                        )}
                        {result.candidate_information.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {result.candidate_information.location}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dual Rings: Overall Score & ATS Score */}
                  <div className="flex items-center gap-6 justify-center sm:justify-end">
                    <ScoreRing
                      score={result.overall_score}
                      label="Overall Fit"
                      size={110}
                      strokeWidth={10}
                    />
                    <ScoreRing
                      score={result.ats_score}
                      label="ATS Score"
                      size={110}
                      strokeWidth={10}
                    />
                  </div>
                </div>
              </div>

              {/* Sub-Score Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ScoreCard
                  title="Skills Match"
                  score={result.skills_score}
                  explanation="Alignment of core competencies"
                />
                <ScoreCard
                  title="Content Impact"
                  score={result.content_score}
                  explanation="Metric-driven achievements"
                />
                <ScoreCard
                  title="Experience Depth"
                  score={result.experience_score}
                  explanation="Relevance to target title"
                />
                <ScoreCard
                  title="Formatting & ATS"
                  score={result.formatting_score}
                  explanation="Layout and parsability"
                />
              </div>

              {/* Executive Summary */}
              <div className="p-6 rounded-2xl bg-[#141419] border border-[#303038] space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#F7F7FA]">
                  <AlignLeft className="w-4 h-4 text-[#FF7417]" />
                  <span>Executive Profile Summary</span>
                </div>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  {result.professional_summary}
                </p>
              </div>

              {/* Strengths & Weaknesses Accordions */}
              <div className="space-y-3">
                <SectionAccordion
                  title="Candidate Strengths & Key Advantages"
                  count={result.strengths.length}
                  icon={CheckCircle2}
                  defaultOpen={true}
                >
                  <ul className="space-y-2.5">
                    {result.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-[#A1A1AA]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </SectionAccordion>

                <SectionAccordion
                  title="Primary Weaknesses & Gaps Identified"
                  count={result.weaknesses.length}
                  icon={AlertTriangle}
                  defaultOpen={true}
                >
                  <ul className="space-y-2.5">
                    {result.weaknesses.map((weakness, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-[#A1A1AA]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C91432] mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </SectionAccordion>

                {result.missing_skills && result.missing_skills.length > 0 && (
                  <SectionAccordion
                    title="Missing Keywords & Skills for ATS"
                    count={result.missing_skills.length}
                    icon={Target}
                    defaultOpen={true}
                  >
                    <div className="flex flex-wrap gap-2">
                      {result.missing_skills.map((skill, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-[#C91432]/10 border border-[#C91432]/30 text-[#F04452] text-xs font-mono"
                        >
                          + {skill}
                        </span>
                      ))}
                    </div>
                  </SectionAccordion>
                )}

                {result.ats_keywords && result.ats_keywords.length > 0 && (
                  <SectionAccordion
                    title="Recommended ATS Keyword Density"
                    count={result.ats_keywords.length}
                    icon={FileCheck2}
                    defaultOpen={false}
                  >
                    <div className="flex flex-wrap gap-2">
                      {result.ats_keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-[#1C1C23] border border-[#303038] text-[#FF9B45] text-xs font-mono"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </SectionAccordion>
                )}

                {result.interview_questions && result.interview_questions.length > 0 && (
                  <SectionAccordion
                    title="Target Role Interview Preparation Questions"
                    count={result.interview_questions.length}
                    icon={HelpCircle}
                    defaultOpen={false}
                  >
                    <ul className="space-y-3">
                      {result.interview_questions.map((q, i) => (
                        <li key={i} className="p-3 rounded-xl bg-[#1C1C23] border border-[#303038] text-xs text-[#F7F7FA]">
                          <span className="text-[#FF7417] font-bold mr-2">Q{i + 1}:</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </SectionAccordion>
                )}

                {result.recommended_certifications && result.recommended_certifications.length > 0 && (
                  <SectionAccordion
                    title="Recommended Certifications & Upskilling"
                    count={result.recommended_certifications.length}
                    icon={Award}
                    defaultOpen={false}
                  >
                    <ul className="space-y-2 text-xs text-[#A1A1AA]">
                      {result.recommended_certifications.map((cert, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Award className="w-3.5 h-3.5 text-[#FF7417]" />
                          <span>{cert}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionAccordion>
                )}
              </div>

              {/* Evaluator Assessment & Disclaimer */}
              <div className="p-6 rounded-2xl bg-[#141419] border border-[#303038] space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#F7F7FA]">
                  <Sparkles className="w-4 h-4 text-[#FF7417]" />
                  <span>Final Hiring Readiness Assessment</span>
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {result.final_assessment}
                </p>

                <div className="pt-3 border-t border-[#303038] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#A1A1AA]/60">
                  <span>Model: <code className="font-mono text-[#FF7417]">{result.model_used}</code></span>
                  <span>{result.disclaimer}</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <ReportActions
                onPrint={handlePrint}
                onCopySummary={handleCopySummary}
                onReset={handleReset}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
