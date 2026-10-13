import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Briefcase,
  Building,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Search,
  FileText,
  Check,
  X,
  History as HistoryIcon,
  Trash2,
  Wand2,
  ShieldCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { jobMatchService } from '@/services/jobMatchService';
import { resumeDocumentService } from '@/services/resumeDocumentService';
import { ResumeSummary, ResumeVersionSummary } from '@/types/resume';
import {
  JobMatchReportDetail,
  JobMatchReportSummary,
  RequirementMatchItem,
  TailoredResumeDraftResponse,
} from '@/types/jobMatch';
import { ApiKeyInput } from '@/components/ui/ApiKeyInput';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

export const JobMatchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tab: 'workspace' | 'history'
  const [activeTab, setActiveTab] = useState<'workspace' | 'history'>('workspace');

  // Resumes list & version selectors
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [versions, setVersions] = useState<ResumeVersionSummary[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [isLoadingResumes, setIsLoadingResumes] = useState<boolean>(true);

  // Job description inputs
  const [jobTitle, setJobTitle] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('');

  // Gemini BYOK Credentials (strictly in-memory state)
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentReport, setCurrentReport] = useState<JobMatchReportDetail | null>(null);

  // Tailoring state
  const [acceptedRecIds, setAcceptedRecIds] = useState<string[]>([]);
  const [customEdits, setCustomEdits] = useState<Record<string, string>>({});
  const [confirmedFacts, setConfirmedFacts] = useState<string[]>([]);
  const [isTailoring, setIsTailoring] = useState<boolean>(false);
  const [tailoredDraft, setTailoredDraft] = useState<TailoredResumeDraftResponse | null>(null);
  const [showTailorModal, setShowTailorModal] = useState<boolean>(false);

  // Save tailored resume state
  const [saveAction, setSaveAction] = useState<'new_version' | 'new_document'>('new_version');
  const [saveTitle, setSaveTitle] = useState<string>('');
  const [versionNotes, setVersionNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // History state
  const [historyReports, setHistoryReports] = useState<JobMatchReportSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [reportToDelete, setReportToDelete] = useState<JobMatchReportSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Category filter in requirements matrix
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'error'>('info');

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMessage(message);
    setToastType(type);
  };

  // 1. Fetch user resumes on mount
  useEffect(() => {
    const fetchResumes = async () => {
      setIsLoadingResumes(true);
      try {
        const list = await resumeDocumentService.listResumes();
        setResumes(list);
        const queryResumeId = searchParams.get('resume_id');
        if (queryResumeId && list.some((r) => r.id === queryResumeId)) {
          setSelectedResumeId(queryResumeId);
        } else if (list.length > 0) {
          setSelectedResumeId(list[0].id);
        }
      } catch (err: unknown) {
        console.error('Failed to load resumes:', err);
      } finally {
        setIsLoadingResumes(false);
      }
    };
    fetchResumes();
  }, [searchParams]);

  // 2. Fetch versions when selected resume changes
  useEffect(() => {
    if (!selectedResumeId) {
      setVersions([]);
      setSelectedVersionId('');
      return;
    }
    const fetchVersions = async () => {
      try {
        const vList = await resumeDocumentService.listVersions(selectedResumeId);
        setVersions(vList);
        if (vList.length > 0) {
          setSelectedVersionId(vList[0].id);
        }
      } catch (err) {
        console.error('Failed to load resume versions:', err);
      }
    };
    fetchVersions();
  }, [selectedResumeId]);

  // 3. Fetch history reports
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const items = await jobMatchService.listJobMatches();
      setHistoryReports(items);
    } catch (err) {
      console.error('Failed to fetch match history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Validate job description length
  const charCount = jobDescription.length;
  const isTooShort = charCount > 0 && charCount < 50;
  const isTooLong = charCount > 100000;
  const isUrlPasted =
    jobDescription.trim().startsWith('http://') ||
    jobDescription.trim().startsWith('https://') ||
    jobDescription.trim().startsWith('www.');

  // Handle Analysis Run
  const handleAnalyzeFit = async () => {
    if (!selectedResumeId) {
      showToast('Please select a resume to compare.', 'error');
      return;
    }
    if (!jobDescription.trim()) {
      showToast('Please paste a job description.', 'error');
      return;
    }
    if (isTooShort) {
      showToast('Job description must be at least 50 characters.', 'error');
      return;
    }
    if (isTooLong) {
      showToast('Job description is too large (maximum 100,000 characters).', 'error');
      return;
    }
    if (isUrlPasted && charCount < 200) {
      showToast(
        'Direct web URL scraping is disabled for SSRF security. Please paste the job description text.',
        'error'
      );
      return;
    }
    if (!apiKey.trim()) {
      showToast('Please provide your Gemini API key (BYOK).', 'error');
      return;
    }

    setIsAnalyzing(true);
    setCurrentReport(null);
    setTailoredDraft(null);

    try {
      const report = await jobMatchService.analyzeJobMatch(
        {
          resume_id: selectedResumeId,
          version_id: selectedVersionId || null,
          job_description: jobDescription.trim(),
          job_title: jobTitle.trim() || undefined,
          company_name: companyName.trim() || undefined,
          target_role: targetRole.trim() || undefined,
          model: selectedModel,
        },
        apiKey.trim()
      );

      setCurrentReport(report);
      // Pre-select high-priority recommendations by default
      const defaultAccepted = report.recommendations
        .filter((r) => r.priority === 'high' && !r.requires_user_confirmation)
        .map((r) => r.id);
      setAcceptedRecIds(defaultAccepted);
      showToast('Job match analysis successfully generated!', 'success');
    } catch (err: unknown) {
      let msg = 'Failed to analyze job description match.';
      if (axios.isAxiosError(err)) {
        msg =
          err.response?.data?.detail?.message ||
          err.response?.data?.message ||
          err.message ||
          msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      showToast(msg, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle recommendation acceptance
  const toggleRecommendation = (recId: string) => {
    setAcceptedRecIds((prev) =>
      prev.includes(recId) ? prev.filter((id) => id !== recId) : [...prev, recId]
    );
  };

  // Confirm missing fact truthfulness
  const toggleConfirmedFact = (recId: string) => {
    setConfirmedFacts((prev) =>
      prev.includes(recId) ? prev.filter((id) => id !== recId) : [...prev, recId]
    );
  };

  // Handle Tailoring Draft Synthesis
  const handleGenerateTailoredDraft = async () => {
    if (!currentReport) return;
    if (acceptedRecIds.length === 0) {
      showToast('Please accept at least one recommendation to tailor your resume.', 'info');
      return;
    }

    setIsTailoring(true);
    try {
      const draft = await jobMatchService.tailorResumeDraft(currentReport.id, {
        accepted_recommendation_ids: acceptedRecIds,
        custom_edits: customEdits,
        confirmed_missing_facts: confirmedFacts,
      });
      setTailoredDraft(draft);
      setSaveTitle(`Tailored - ${currentReport.job_title}`);
      setVersionNotes(`Tailored for ${currentReport.job_title} at ${currentReport.company_name || 'Target Role'}`);
      setShowTailorModal(true);
      showToast('Tailored draft generated with change diffs!', 'success');
    } catch (err: unknown) {
      let msg = 'Failed to generate tailored draft.';
      if (axios.isAxiosError(err)) {
        msg =
          err.response?.data?.detail?.message ||
          err.response?.data?.message ||
          err.message ||
          msg;
      }
      showToast(msg, 'error');
    } finally {
      setIsTailoring(false);
    }
  };

  // Handle Save Tailored Resume
  const handleSaveTailored = async () => {
    if (!currentReport || !tailoredDraft) return;

    setIsSaving(true);
    try {
      const savedResume = await jobMatchService.saveTailoredResume(currentReport.id, {
        tailored_resume_data: tailoredDraft.tailored_resume_data,
        action: saveAction,
        target_resume_id: saveAction === 'new_version' ? currentReport.resume_id : null,
        title: saveTitle.trim() || `Tailored - ${currentReport.job_title}`,
        version_notes: versionNotes.trim() || `Tailored for ${currentReport.job_title}`,
      });

      setShowTailorModal(false);
      showToast(
        saveAction === 'new_version'
          ? 'New version successfully saved to resume history!'
          : 'New tailored resume successfully created in library!',
        'success'
      );
      // Navigate to resume editor
      navigate(`/resumes/${savedResume.id}`);
    } catch (err: unknown) {
      let msg = 'Failed to save tailored resume.';
      if (axios.isAxiosError(err)) {
        msg =
          err.response?.data?.detail?.message ||
          err.response?.data?.message ||
          err.message ||
          msg;
      }
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter requirements by category
  const filteredRequirements = useMemo(() => {
    if (!currentReport) return [];
    const items = currentReport.comparison_result.items;
    if (categoryFilter === 'all') return items;
    return items.filter((item) => item.category === categoryFilter);
  }, [currentReport, categoryFilter]);

  // Load a historical report
  const handleLoadHistoricalReport = async (reportSummary: JobMatchReportSummary) => {
    try {
      const full = await jobMatchService.getJobMatch(reportSummary.id);
      setCurrentReport(full);
      setActiveTab('workspace');
      setSelectedResumeId(full.resume_id);
      setSelectedVersionId(full.resume_version_id);
      setJobTitle(full.job_title);
      setCompanyName(full.company_name || '');
      setJobDescription(full.job_description_raw);
      showToast(`Loaded analysis report for "${full.job_title}"`, 'info');
    } catch (err) {
      console.error(err);
      showToast('Failed to load job match report details.', 'error');
    }
  };

  // Delete historical report
  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    try {
      await jobMatchService.deleteJobMatch(reportToDelete.id);
      setHistoryReports((prev) => prev.filter((r) => r.id !== reportToDelete.id));
      if (currentReport?.id === reportToDelete.id) {
        setCurrentReport(null);
      }
      setReportToDelete(null);
      showToast('Report deleted successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete report.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: RequirementMatchItem['status']) => {
    switch (status) {
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Matched
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-3 h-3" />
            Partial Evidence
          </span>
        );
      case 'not_evidenced':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C91432]/10 text-[#F04452] border border-[#C91432]/20">
            <X className="w-3 h-3" />
            Missing Evidence
          </span>
        );
      case 'not_assessable':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            <HelpCircle className="w-3 h-3" />
            Not Assessable
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#C91432]/20 text-[#F04452] border border-[#C91432]/30 uppercase tracking-wider">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FF7417]/20 text-[#FF9B45] border border-[#FF7417]/30 uppercase tracking-wider">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-wider">
            Low
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-[#F7F7FA] pb-24">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header Banner */}
      <div className="border-b border-[#303038] bg-gradient-to-b from-[#141419] to-[#0B0B0E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF7417]/10 border border-[#FF7417]/20 text-[#FF7417] text-xs font-semibold uppercase tracking-wider mb-2">
                <Briefcase className="w-3.5 h-3.5" />
                Phase 8 Feature
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                AI Job Description Matcher
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C91432] via-[#F04452] to-[#FF7417]">
                  & Fit Analyzer
                </span>
              </h1>
              <p className="mt-1 text-sm text-[#A1A1AA] max-w-2xl">
                Compare your resume against any job description with explainable requirement matching,
                keyword gap analysis, and tailored bullet point drafting.
              </p>
            </div>

            {/* Tab switchers */}
            <div className="flex items-center gap-2 p-1 bg-[#141419] border border-[#303038] rounded-xl self-start md:self-auto">
              <button
                onClick={() => setActiveTab('workspace')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'workspace'
                    ? 'bg-[#C91432] text-white shadow-md shadow-[#C91432]/30'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Match Workspace
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-[#C91432] text-white shadow-md shadow-[#C91432]/30'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <HistoryIcon className="w-4 h-4" />
                History & Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {activeTab === 'history' ? (
          /* HISTORY VIEW */
          <div className="bg-[#141419] border border-[#303038] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <HistoryIcon className="w-5 h-5 text-[#FF7417]" />
                  Saved Job Match Reports
                </h2>
                <p className="text-xs text-[#A1A1AA]">
                  Review previous job alignment scores and tailored recommendations.
                </p>
              </div>
              <button
                onClick={fetchHistory}
                disabled={isLoadingHistory}
                className="p-2 rounded-lg bg-[#1B1B22] border border-[#303038] text-[#A1A1AA] hover:text-white"
                title="Refresh history"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="py-12 text-center text-[#A1A1AA]">Loading reports...</div>
            ) : historyReports.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-[#303038] rounded-xl">
                <Briefcase className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-[#A1A1AA]">No job match analyses found.</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Run an analysis in the Match Workspace to see your saved evaluations here.
                </p>
                <SecondaryButton
                  onClick={() => setActiveTab('workspace')}
                  className="mt-4"
                >
                  Go to Match Workspace
                </SecondaryButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {historyReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-5 rounded-xl bg-[#1B1B22] border border-[#303038] hover:border-[#FF7417]/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {report.overall_score}% Match
                        </span>
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-base truncate">
                        {report.job_title}
                      </h3>
                      <p className="text-xs text-[#A1A1AA] flex items-center gap-1.5 mt-1">
                        <Building className="w-3.5 h-3.5 text-[#FF7417]" />
                        {report.company_name || 'Not specified'}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-[#141419] border border-[#303038]">
                          <span className="text-zinc-500 block text-[10px]">Req. Skills</span>
                          <span className="font-semibold text-white">{report.required_skills_score}%</span>
                        </div>
                        <div className="p-2 rounded bg-[#141419] border border-[#303038]">
                          <span className="text-zinc-500 block text-[10px]">Keywords</span>
                          <span className="font-semibold text-white">{report.keyword_score}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#303038] flex items-center justify-between gap-2">
                      <SecondaryButton
                        onClick={() => handleLoadHistoricalReport(report)}
                        className="text-xs py-1.5 px-3 flex-1"
                      >
                        Load Report
                      </SecondaryButton>
                      <button
                        onClick={() => setReportToDelete(report)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-[#F04452] hover:bg-[#C91432]/10 transition-colors"
                        title="Delete report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* WORKSPACE VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN: Input Workspace (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#141419] border border-[#303038] rounded-2xl p-6 shadow-xl">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#FF7417]" />
                  1. Select Target Resume
                </h2>

                {isLoadingResumes ? (
                  <div className="text-xs text-[#A1A1AA] py-4 text-center">Loading resumes...</div>
                ) : resumes.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#1B1B22] border border-dashed border-[#303038] text-center">
                    <p className="text-xs text-[#A1A1AA] mb-2">No resumes in your library yet.</p>
                    <SecondaryButton onClick={() => navigate('/resumes')}>
                      Create or Upload Resume
                    </SecondaryButton>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                        Saved Resume
                      </label>
                      <select
                        value={selectedResumeId}
                        onChange={(e) => setSelectedResumeId(e.target.value)}
                        className="w-full bg-[#1B1B22] border border-[#303038] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7417]"
                      >
                        {resumes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title} ({r.target_role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {versions.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                          Version Snapshot
                        </label>
                        <select
                          value={selectedVersionId}
                          onChange={(e) => setSelectedVersionId(e.target.value)}
                          className="w-full bg-[#1B1B22] border border-[#303038] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7417]"
                        >
                          {versions.map((v) => (
                            <option key={v.id} value={v.id}>
                              v{v.version_number} &mdash; {v.version_notes || 'Snapshot'} (
                              {new Date(v.created_at).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Job Details Input */}
              <div className="bg-[#141419] border border-[#303038] rounded-2xl p-6 shadow-xl space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#C91432]" />
                  2. Job Specifications
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Senior AI Engineer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full bg-[#1B1B22] border border-[#303038] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7417]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                      Company Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DeepMind"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-[#1B1B22] border border-[#303038] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7417]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                      Target Role (Fallback)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AI Developer"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className="w-full bg-[#1B1B22] border border-[#303038] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7417]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      Job Description Text <span className="text-[#F04452]">*</span>
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        isTooShort
                          ? 'text-[#F04452]'
                          : isTooLong
                          ? 'text-[#F04452]'
                          : 'text-zinc-500'
                      }`}
                    >
                      {charCount.toLocaleString()} / 100,000
                    </span>
                  </div>

                  <textarea
                    rows={8}
                    placeholder="Paste the full job posting requirements, responsibilities, and qualifications here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full bg-[#1B1B22] border border-[#303038] rounded-xl p-3 text-xs leading-relaxed text-white focus:outline-none focus:border-[#FF7417] resize-y"
                  />

                  {/* SSRF & URL Guidance Callout */}
                  <div className="mt-2 p-2.5 rounded-lg bg-[#1B1B22]/70 border border-[#303038] text-[11px] text-[#A1A1AA] flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#FF7417] shrink-0 mt-0.5" />
                    <span>
                      <strong>Security Note:</strong> Direct web URL scraping is disallowed to prevent
                      SSRF vulnerabilities. Please paste the job text directly above.
                    </span>
                  </div>
                </div>

                {/* Gemini Model Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                    Gemini Model
                  </label>
                  <ModelSelector
                    selectedModel={selectedModel}
                    onChange={setSelectedModel}
                    models={[
                      'gemini-2.5-flash',
                      'gemini-2.0-flash',
                      'gemini-1.5-flash',
                      'gemini-1.5-pro',
                    ]}
                  />
                </div>

                {/* Gemini BYOK Key Input */}
                <div>
                  <ApiKeyInput
                    value={apiKey}
                    onChange={setApiKey}
                    selectedModel={selectedModel}
                  />
                </div>

                {/* Analyze Action */}
                <PrimaryButton
                  onClick={handleAnalyzeFit}
                  disabled={isAnalyzing || !selectedResumeId || !jobDescription.trim()}
                  className="w-full py-3 mt-2"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Evaluating Resume Alignment...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2 font-bold">
                      <Wand2 className="w-4 h-4" />
                      Analyze Match & Fit
                    </span>
                  )}
                </PrimaryButton>
              </div>
            </div>

            {/* RIGHT COLUMN: Results Dashboard (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {!currentReport ? (
                /* Empty state / placeholder */
                <div className="bg-[#141419] border border-[#303038] rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[460px]">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#C91432]/20 to-[#FF7417]/20 border border-[#FF7417]/30 flex items-center justify-center mb-4 text-[#FF7417]">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">No Active Analysis</h3>
                  <p className="text-sm text-[#A1A1AA] max-w-md">
                    Select a resume from your library, paste the job posting on the left, and click
                    &quot;Analyze Match & Fit&quot; to review evidence alignment and AI recommendations.
                  </p>
                </div>
              ) : (
                /* ACTIVE REPORT DASHBOARD */
                <div className="space-y-6 animate-fadeIn">
                  {/* Score Overview Card */}
                  <div className="bg-[#141419] border border-[#303038] rounded-2xl p-6 shadow-xl">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-[#303038]">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#FF7417]">
                          Overall Fit Score
                        </span>
                        <h2 className="text-2xl font-black text-white mt-1">
                          {currentReport.job_title}
                        </h2>
                        <p className="text-xs text-[#A1A1AA] flex items-center gap-1.5 mt-0.5">
                          <Building className="w-3.5 h-3.5 text-zinc-500" />
                          {currentReport.company_name || 'Target Company'} &bull; Scoring Engine {currentReport.scoring_version}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <ScoreRing
                          score={currentReport.overall_score}
                          size={110}
                          label="Overall Match"
                        />
                      </div>
                    </div>

                    {/* Breakdown Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                      <div className="p-3 rounded-xl bg-[#1B1B22] border border-[#303038]">
                        <span className="text-[11px] text-[#A1A1AA] block">Required Skills</span>
                        <span className="text-lg font-bold text-white">
                          {currentReport.comparison_result.score_breakdown.required_skills_score}%
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#1B1B22] border border-[#303038]">
                        <span className="text-[11px] text-[#A1A1AA] block">Preferred Skills</span>
                        <span className="text-lg font-bold text-white">
                          {currentReport.comparison_result.score_breakdown.preferred_skills_score}%
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#1B1B22] border border-[#303038]">
                        <span className="text-[11px] text-[#A1A1AA] block">Experience</span>
                        <span className="text-lg font-bold text-white">
                          {currentReport.comparison_result.score_breakdown.experience_score}%
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#1B1B22] border border-[#303038]">
                        <span className="text-[11px] text-[#A1A1AA] block">Keywords</span>
                        <span className="text-lg font-bold text-white">
                          {currentReport.comparison_result.score_breakdown.keyword_score}%
                        </span>
                      </div>
                    </div>

                    {/* Evidence Count Indicators */}
                    <div className="mt-4 pt-4 border-t border-[#303038] flex flex-wrap items-center justify-between text-xs text-[#A1A1AA] gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Matched: <strong>{currentReport.comparison_result.score_breakdown.matched_count}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Partial: <strong>{currentReport.comparison_result.score_breakdown.partial_count}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F04452]" />
                        <span>Not Evidenced: <strong>{currentReport.comparison_result.score_breakdown.not_evidenced_count}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Items with insufficient resume data do not penalize your score.">
                        <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
                        <span>Unassessable: <strong>{currentReport.comparison_result.score_breakdown.not_assessable_count}</strong> (exempt)</span>
                      </div>
                    </div>
                  </div>

                  {/* Keywords Comparison Card */}
                  <div className="bg-[#141419] border border-[#303038] rounded-2xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Search className="w-4 h-4 text-[#FF7417]" />
                      Keywords Alignment & Gap Analysis
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[11px] font-semibold text-emerald-400 block mb-1.5">
                          Verifiable Keywords Found on Resume (
                          {currentReport.comparison_result.score_breakdown.matched_keywords.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {currentReport.comparison_result.score_breakdown.matched_keywords.length === 0 ? (
                            <span className="text-xs text-zinc-500 italic">None detected</span>
                          ) : (
                            currentReport.comparison_result.score_breakdown.matched_keywords.map((kw, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-md text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                              >
                                {kw}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="text-[11px] font-semibold text-[#FF9B45] block mb-1.5">
                          Missing or Unemphasized Keywords (
                          {currentReport.comparison_result.score_breakdown.missing_keywords.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {currentReport.comparison_result.score_breakdown.missing_keywords.length === 0 ? (
                            <span className="text-xs text-emerald-400">All target keywords evidenced!</span>
                          ) : (
                            currentReport.comparison_result.score_breakdown.missing_keywords.map((kw, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-md text-xs font-mono bg-[#FF7417]/10 text-[#FF9B45] border border-[#FF7417]/20"
                              >
                                {kw}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Requirements Matrix */}
                  <div className="bg-[#141419] border border-[#303038] rounded-2xl p-6 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Requirement Evidence Matrix
                        </h3>
                        <p className="text-xs text-[#A1A1AA]">
                          Specific qualifications evaluated against your resume text.
                        </p>
                      </div>

                      {/* Category Pills */}
                      <div className="flex flex-wrap gap-1 text-xs">
                        {['all', 'required_skill', 'preferred_skill', 'experience', 'education'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                              categoryFilter === cat
                                ? 'bg-[#C91432] text-white font-semibold'
                                : 'bg-[#1B1B22] text-[#A1A1AA] hover:text-white border border-[#303038]'
                            }`}
                          >
                            {cat === 'all' ? 'All' : cat.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {filteredRequirements.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-[#1B1B22] border border-[#303038] hover:border-zinc-600 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-white">
                              {item.requirement}
                            </span>
                            {getStatusBadge(item.status)}
                          </div>

                          {item.evidence && (
                            <p className="text-[11px] text-emerald-400/90 font-mono bg-emerald-950/20 p-2 rounded border border-emerald-900/30 mt-2">
                              &ldquo;{item.evidence}&rdquo;
                            </p>
                          )}

                          {item.gap_analysis && (
                            <p className="text-[11px] text-[#A1A1AA] mt-1.5 flex items-start gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span>{item.gap_analysis}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actionable Recommendations Checklist */}
                  <div className="bg-[#141419] border border-[#303038] rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Wand2 className="w-4 h-4 text-[#FF7417]" />
                          Tailoring Recommendations ({currentReport.recommendations.length})
                        </h3>
                        <p className="text-xs text-[#A1A1AA]">
                          Select the improvements you want applied to generate a customized draft.
                        </p>
                      </div>

                      <span className="text-xs font-semibold text-[#FF7417]">
                        {acceptedRecIds.length} Accepted
                      </span>
                    </div>

                    <div className="space-y-4">
                      {currentReport.recommendations.map((rec) => {
                        const isAccepted = acceptedRecIds.includes(rec.id);
                        const isConfirmed = confirmedFacts.includes(rec.id);

                        return (
                          <div
                            key={rec.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isAccepted
                                ? 'bg-[#1B1B22] border-[#C91432]/50 shadow-md shadow-[#C91432]/10'
                                : 'bg-[#141419] border-[#303038] opacity-75'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`rec-${rec.id}`}
                                  checked={isAccepted}
                                  onChange={() => toggleRecommendation(rec.id)}
                                  className="w-4 h-4 rounded text-[#C91432] focus:ring-[#C91432] bg-[#1B1B22] border-[#303038]"
                                />
                                <label
                                  htmlFor={`rec-${rec.id}`}
                                  className="text-xs font-bold text-white cursor-pointer"
                                >
                                  {rec.recommended_action}
                                </label>
                              </div>
                              {getPriorityBadge(rec.priority)}
                            </div>

                            <p className="text-xs text-[#A1A1AA] ml-6 mb-2">
                              {rec.reason} &bull; <span className="text-zinc-500 font-mono">Target: {rec.target_section}</span>
                            </p>

                            {/* Proposed Text */}
                            <div className="ml-6 p-2.5 rounded-lg bg-[#0B0B0E] border border-[#303038] text-xs font-mono text-zinc-300">
                              <span className="text-[10px] text-zinc-500 block uppercase mb-1">
                                Proposed Enhancement:
                              </span>
                              {rec.proposed_text}
                            </div>

                            {/* Anti-Hallucination User Confirmation Notice */}
                            {rec.requires_user_confirmation && (
                              <div className="ml-6 mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-semibold block">
                                      Factual Confirmation Required:
                                    </span>
                                    <span>
                                      Antigravity never invents metrics or skills. Check below to certify
                                      that you truthfully possess this experience:
                                    </span>
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer text-amber-300 font-medium">
                                      <input
                                        type="checkbox"
                                        checked={isConfirmed}
                                        onChange={() => toggleConfirmedFact(rec.id)}
                                        className="rounded text-amber-500 focus:ring-amber-500"
                                      />
                                      <span>I confirm this experience is accurate and truthful.</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Custom Note or Tweaks */}
                            {isAccepted && (
                              <div className="ml-6 mt-2">
                                <input
                                  type="text"
                                  placeholder="Add optional custom note or tweak for this recommendation..."
                                  value={customEdits[rec.id] || ''}
                                  onChange={(e) =>
                                    setCustomEdits({ ...customEdits, [rec.id]: e.target.value })
                                  }
                                  className="w-full bg-[#0B0B0E] border border-[#303038] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF7417]"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Synthesis Button */}
                    <div className="mt-6 pt-4 border-t border-[#303038] flex items-center justify-between">
                      <span className="text-xs text-[#A1A1AA]">
                        Ready to apply {acceptedRecIds.length} accepted change(s)?
                      </span>
                      <PrimaryButton
                        onClick={handleGenerateTailoredDraft}
                        disabled={isTailoring || acceptedRecIds.length === 0}
                      >
                        {isTailoring ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Synthesizing Draft...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Generate Tailored Draft
                          </span>
                        )}
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TAILORED DRAFT PREVIEW & SAVE MODAL */}
      {showTailorModal && tailoredDraft && (
        <Modal
          isOpen={showTailorModal}
          onClose={() => setShowTailorModal(false)}
          title="Tailored Resume Draft & Diff Summary"
          size="xl"
        >
          <div className="space-y-6">
            <p className="text-xs text-[#A1A1AA]">
              Review the synthesized modifications below. Original resume content has been preserved,
              with targeted bullet point refinements applied.
            </p>

            {/* Before vs After Diff Preview */}
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
              {tailoredDraft.diff_summary.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#1B1B22] border border-[#303038] text-center text-xs text-zinc-400">
                  No structural diff items generated.
                </div>
              ) : (
                tailoredDraft.diff_summary.map((diff, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#141419] border border-[#303038] space-y-2"
                  >
                    <span className="text-xs font-bold text-[#FF7417] uppercase tracking-wider block">
                      {diff.section}
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-[#C91432]/10 border border-[#C91432]/20 text-zinc-300">
                        <span className="text-[10px] text-[#F04452] font-bold block uppercase mb-1">
                          Original:
                        </span>
                        <p className="font-mono text-xs whitespace-pre-wrap">{diff.original || '(Empty)'}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-zinc-200">
                        <span className="text-[10px] text-emerald-400 font-bold block uppercase mb-1">
                          Tailored Enhancement:
                        </span>
                        <p className="font-mono text-xs whitespace-pre-wrap">{diff.tailored}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Save Options */}
            <div className="p-4 rounded-xl bg-[#1B1B22] border border-[#303038] space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Save Destination
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    saveAction === 'new_version'
                      ? 'bg-[#141419] border-[#C91432]'
                      : 'bg-[#141419]/60 border-[#303038]'
                  }`}
                >
                  <input
                    type="radio"
                    name="saveAction"
                    value="new_version"
                    checked={saveAction === 'new_version'}
                    onChange={() => setSaveAction('new_version')}
                    className="mt-1 text-[#C91432] focus:ring-[#C91432]"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Save as New Version Snapshot
                    </span>
                    <span className="text-[11px] text-[#A1A1AA]">
                      Appends an immutable version to the current resume document.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    saveAction === 'new_document'
                      ? 'bg-[#141419] border-[#FF7417]'
                      : 'bg-[#141419]/60 border-[#303038]'
                  }`}
                >
                  <input
                    type="radio"
                    name="saveAction"
                    value="new_document"
                    checked={saveAction === 'new_document'}
                    onChange={() => setSaveAction('new_document')}
                    className="mt-1 text-[#FF7417] focus:ring-[#FF7417]"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Save as Brand New Document
                    </span>
                    <span className="text-[11px] text-[#A1A1AA]">
                      Creates a dedicated new resume in your library.
                    </span>
                  </div>
                </label>
              </div>

              {saveAction === 'new_document' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                    New Resume Title
                  </label>
                  <input
                    type="text"
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="e.g. Resume - AI Developer (Tailored)"
                    className="w-full bg-[#141419] border border-[#303038] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF7417]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                    Version Notes
                  </label>
                  <input
                    type="text"
                    value={versionNotes}
                    onChange={(e) => setVersionNotes(e.target.value)}
                    placeholder="e.g. Tailored for DeepMind AI Engineer role"
                    className="w-full bg-[#141419] border border-[#303038] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF7417]"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303038]">
              <SecondaryButton onClick={() => setShowTailorModal(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleSaveTailored} disabled={isSaving}>
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Confirm & Save Tailored Resume
                  </span>
                )}
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {reportToDelete && (
        <Modal
          isOpen={!!reportToDelete}
          onClose={() => setReportToDelete(null)}
          title="Delete Job Match Report"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-[#A1A1AA]">
              Are you sure you want to permanently delete the analysis report for{' '}
              <strong className="text-white">{reportToDelete.job_title}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <SecondaryButton onClick={() => setReportToDelete(null)}>Cancel</SecondaryButton>
              <button
                onClick={handleDeleteReport}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C91432] text-white hover:bg-[#F04452] transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete Report'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default JobMatchPage;
