import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  GitBranch,
  PenTool,
  Compass,
  Layers,
  FolderGit2,
  Bookmark,
  RotateCw,
  Check,
  Eye,
  Save,
  CheckCircle,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { ApiKeyInput } from '@/components/ui/ApiKeyInput';
import { resumeDocumentService } from '@/services/resumeDocumentService';
import { ResumeSummary } from '@/types/resume';
import {
  RoleVariantDraftResponse,
  VariantComparisonResponse,
  CareerRoadmapResponse,
  MultiRoleCompareResponse,
  ProjectRecommendationItem,
} from '@/types/careerIntelligence';
import { careerIntelligenceService } from '@/services/careerIntelligenceService';
import { WritingAssistantPanel } from '@/components/career/WritingAssistantPanel';
import { VariantComparisonModal } from '@/components/career/VariantComparisonModal';
import { CareerRoadmapView } from '@/components/career/CareerRoadmapView';
import { MultiRoleMatrixView } from '@/components/career/MultiRoleMatrixView';
import { ProjectRecommendationsView } from '@/components/career/ProjectRecommendationsView';

type CareerTab = 'variants' | 'writing' | 'roadmap' | 'multi_role' | 'projects' | 'saved_roadmaps';

const PRESET_ROLES = [
  'AI Developer',
  'Data Analyst',
  'Python Developer',
  'Automation Engineer',
  'Mechanical Engineer',
  'Manufacturing Engineer',
];

export const CareerIntelligencePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CareerTab>('variants');
  const [apiKey, setApiKey] = useState<string>('');

  // Resume library
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [isLoadingResumes, setIsLoadingResumes] = useState<boolean>(true);

  // Tab 1: Variant Generator
  const [targetRole, setTargetRole] = useState<string>('AI Developer');
  const [customRole, setCustomRole] = useState<string>('');
  const [variantJobDescription, setVariantJobDescription] = useState<string>('');
  const [isGeneratingVariant, setIsGeneratingVariant] = useState<boolean>(false);
  const [variantDraft, setVariantDraft] = useState<RoleVariantDraftResponse | null>(null);
  const [variantDiff, setVariantDiff] = useState<VariantComparisonResponse | null>(null);
  const [showDiffModal, setShowDiffModal] = useState<boolean>(false);
  const [saveAsNewDoc, setSaveAsNewDoc] = useState<boolean>(true);
  const [isSavingVariant, setIsSavingVariant] = useState<boolean>(false);
  const [variantSaveSuccess, setVariantSaveSuccess] = useState<string | null>(null);

  // Tab 3: Career Roadmap
  const [roadmapRole, setRoadmapRole] = useState<string>('AI Developer');
  const [currentLevel, setCurrentLevel] = useState<string>('Associate / Mid-level');
  const [targetLevel, setTargetLevel] = useState<string>('Senior AI Developer');
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState<boolean>(false);
  const [currentRoadmap, setCurrentRoadmap] = useState<CareerRoadmapResponse | null>(null);
  const [savedRoadmaps, setSavedRoadmaps] = useState<CareerRoadmapResponse[]>([]);
  const [isLoadingSavedRoadmaps, setIsLoadingSavedRoadmaps] = useState<boolean>(false);

  // Tab 4: Multi-Role Comparison
  const [selectedRoles, setSelectedRoles] = useState<string[]>([
    'Python Developer',
    'AI Developer',
    'Data Analyst',
  ]);
  const [isComparingRoles, setIsComparingRoles] = useState<boolean>(false);
  const [multiRoleResult, setMultiRoleResult] = useState<MultiRoleCompareResponse | null>(null);

  // Tab 5: Portfolio Projects
  const [projectRole, setProjectRole] = useState<string>('AI Developer');
  const [skillGapsInput, setSkillGapsInput] = useState<string>('PyTorch, Docker, LLMs');
  const [isRecommendingProjects, setIsRecommendingProjects] = useState<boolean>(false);
  const [recommendedProjects, setRecommendedProjects] = useState<ProjectRecommendationItem[]>([]);

  // Load saved resumes on mount
  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const list = await resumeDocumentService.listResumes();
        setResumes(list);
        if (list.length > 0) {
          setSelectedResumeId(list[0].id);
        }
      } catch {
        // user might have 0 resumes
      } finally {
        setIsLoadingResumes(false);
      }
    };
    fetchResumes();
  }, []);

  // Fetch saved roadmaps when switching to saved roadmaps tab
  useEffect(() => {
    if (activeTab === 'saved_roadmaps') {
      const loadSaved = async () => {
        setIsLoadingSavedRoadmaps(true);
        try {
          const list = await careerIntelligenceService.listRoadmaps();
          setSavedRoadmaps(list);
        } catch {
          // ignore
        } finally {
          setIsLoadingSavedRoadmaps(false);
        }
      };
      loadSaved();
    }
  }, [activeTab]);

  const effectiveRole = targetRole === 'Custom' ? customRole || 'Software Engineer' : targetRole;

  // Handler: Generate Role Variant
  const handleGenerateVariant = async () => {
    if (!selectedResumeId) return;
    setIsGeneratingVariant(true);
    setVariantSaveSuccess(null);
    try {
      const draft = await careerIntelligenceService.generateRoleVariant(
        {
          resume_id: selectedResumeId,
          target_role: effectiveRole,
          job_description: variantJobDescription.trim() || undefined,
        },
        apiKey
      );
      setVariantDraft(draft);

      // Automatically prepare diff against base
      try {
        const diffData = await careerIntelligenceService.compareVariants({
          base_version_id: resumes.find((r) => r.id === selectedResumeId)?.current_version_id || undefined,
          variant_resume_data: draft.resume_data,
        });
        setVariantDiff(diffData);
      } catch {
        // ignore diff error if version not found
      }
    } catch {
      // error handled by UI
    } finally {
      setIsGeneratingVariant(false);
    }
  };

  // Handler: Save Variant
  const handleSaveVariant = async () => {
    if (!variantDraft) return;
    setIsSavingVariant(true);
    try {
      const res = await careerIntelligenceService.saveRoleVariant({
        resume_id: saveAsNewDoc ? undefined : selectedResumeId,
        title: variantDraft.variant_title,
        target_role: variantDraft.target_role,
        resume_data: variantDraft.resume_data,
        save_as_new_document: saveAsNewDoc,
        version_notes: `Role-tailored variant for ${variantDraft.target_role}`,
      });
      setVariantSaveSuccess(
        saveAsNewDoc
          ? `Created new resume document: "${res.title}"`
          : `Appended version v${res.version_number} to existing resume`
      );
    } catch {
      // error handled
    } finally {
      setIsSavingVariant(false);
    }
  };

  // Handler: Generate Roadmap
  const handleGenerateRoadmap = async () => {
    setIsGeneratingRoadmap(true);
    try {
      const data = await careerIntelligenceService.generateRoadmap(
        {
          resume_id: selectedResumeId || undefined,
          target_role: roadmapRole,
          current_level: currentLevel,
          target_level: targetLevel,
        },
        apiKey
      );
      setCurrentRoadmap(data);
    } catch {
      // error handled
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  // Handler: Multi-Role Compare
  const handleMultiRoleCompare = async () => {
    if (!selectedResumeId || selectedRoles.length < 2) return;
    setIsComparingRoles(true);
    try {
      const res = await careerIntelligenceService.compareMultiRole({
        resume_id: selectedResumeId,
        target_roles: selectedRoles,
      });
      setMultiRoleResult(res);
    } catch {
      // error handled
    } finally {
      setIsComparingRoles(false);
    }
  };

  const toggleRoleSelection = (role: string) => {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length > 2) {
        setSelectedRoles(selectedRoles.filter((r) => r !== role));
      }
    } else {
      if (selectedRoles.length < 4) {
        setSelectedRoles([...selectedRoles, role]);
      }
    }
  };

  // Handler: Recommend Projects
  const handleRecommendProjects = async () => {
    setIsRecommendingProjects(true);
    try {
      const gaps = skillGapsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await careerIntelligenceService.recommendProjects(
        {
          target_role: projectRole,
          resume_id: selectedResumeId || undefined,
          skill_gaps: gaps.length > 0 ? gaps : undefined,
        },
        apiKey
      );
      setRecommendedProjects(res.projects);
    } catch {
      // error handled
    } finally {
      setIsRecommendingProjects(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & BYOK Key Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C91432]/20 text-[#F04452] border border-[#C91432]/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FF7417]" />
              Phase 10 Career Suite
            </span>
            <span className="text-xs text-[#A1A1AA]">Advanced AI Career Intelligence</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            AI Career Intelligence & Role Strategy
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1 max-w-2xl">
            Tailor multi-role resume variants, polish section copy with AI writing assistance, map career progression milestones, and evaluate market fit.
          </p>
        </div>

        {/* Gemini BYOK Key Input */}
        <div className="w-full lg:w-96">
          <ApiKeyInput value={apiKey} onChange={setApiKey} />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 rounded-2xl bg-[#141419] border border-white/5 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('variants')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            activeTab === 'variants'
              ? 'bg-[#C91432] text-white shadow-lg shadow-[#C91432]/25'
              : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          Multi-Version Variants
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('writing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            activeTab === 'writing'
              ? 'bg-[#C91432] text-white shadow-lg shadow-[#C91432]/25'
              : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
          }`}
        >
          <PenTool className="w-4 h-4" />
          AI Writing Assistant
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roadmap')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            activeTab === 'roadmap'
              ? 'bg-[#C91432] text-white shadow-lg shadow-[#C91432]/25'
              : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
          }`}
        >
          <Compass className="w-4 h-4" />
          Career Roadmap
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('multi_role')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            activeTab === 'multi_role'
              ? 'bg-[#C91432] text-white shadow-lg shadow-[#C91432]/25'
              : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          Multi-Role Comparison
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            activeTab === 'projects'
              ? 'bg-[#C91432] text-white shadow-lg shadow-[#C91432]/25'
              : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          Portfolio Projects
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saved_roadmaps')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
            activeTab === 'saved_roadmaps'
              ? 'bg-[#C91432] text-white shadow-lg shadow-[#C91432]/25'
              : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          Saved History
        </button>
      </div>

      {/* Global Base Resume Selector Bar (for tabs that use existing resumes) */}
      {activeTab !== 'saved_roadmaps' && (
        <div className="p-4 rounded-2xl bg-[#141419] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-white font-medium">
            <FileText className="w-4 h-4 text-[#FF7417]" />
            <span>Select Base Resume from Library:</span>
          </div>

          <div className="flex-1 max-w-md">
            {isLoadingResumes ? (
              <span className="text-zinc-500">Loading your resumes...</span>
            ) : resumes.length === 0 ? (
              <span className="text-amber-400">No saved resumes found. Create or upload one first.</span>
            ) : (
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#1B1B22] border border-white/10 text-white text-xs focus:outline-none focus:border-[#C91432]"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#141419]">
                    {r.title} ({r.target_role})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: Multi-Version Resume Generator */}
      {activeTab === 'variants' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#141419] border border-white/5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-[#FF7417]" />
                Role-Specific Resume Variant Generator
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Refocus summaries, reorder verified competencies, and highlight relevant experience bullets for distinct roles without fabricating metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-2">
                  Select Target Role
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {PRESET_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setTargetRole(role)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition ${
                        targetRole === role
                          ? 'bg-[#C91432]/20 border-[#C91432] text-white font-semibold'
                          : 'bg-[#1B1B22] border-white/5 text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTargetRole('Custom')}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition ${
                      targetRole === 'Custom'
                        ? 'bg-[#C91432]/20 border-[#C91432] text-white font-semibold'
                        : 'bg-[#1B1B22] border-white/5 text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    Custom Role...
                  </button>
                </div>

                {targetRole === 'Custom' && (
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Enter custom role title..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#1B1B22] border border-white/10 text-white text-xs focus:outline-none focus:border-[#C91432]"
                  />
                )}
              </div>

              {/* Optional Job Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-2">
                  Optional Job Description Context
                </label>
                <textarea
                  value={variantJobDescription}
                  onChange={(e) => setVariantJobDescription(e.target.value)}
                  rows={5}
                  placeholder="Paste specific job posting requirements to align keyword density and emphasis..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1B22] border border-white/10 text-white text-xs focus:outline-none focus:border-[#C91432] resize-y placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Preserves all original employment dates, companies, and academic credentials.
              </span>
              <button
                type="button"
                onClick={handleGenerateVariant}
                disabled={isGeneratingVariant || !selectedResumeId}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#C91432] to-[#FF7417] text-white hover:opacity-90 transition shadow-lg shadow-[#C91432]/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isGeneratingVariant ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Generating Variant...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate {effectiveRole} Variant
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Variant Output Card */}
          {variantDraft && (
            <div className="p-6 rounded-3xl bg-[#141419] border border-white/5 space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      Draft Ready
                    </span>
                    <span className="text-xs text-[#A1A1AA]">{variantDraft.target_role}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{variantDraft.variant_title}</h3>
                </div>

                <div className="flex items-center gap-3">
                  {variantDiff && (
                    <button
                      type="button"
                      onClick={() => setShowDiffModal(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1B1B22] text-white hover:bg-white/10 transition border border-white/10 flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4 text-[#FF7417]" />
                      Side-by-Side Diff
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveVariant}
                    disabled={isSavingVariant}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#C91432] to-[#FF7417] text-white hover:opacity-90 transition shadow-md shadow-[#C91432]/20 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingVariant ? 'Saving...' : 'Save Variant'}
                  </button>
                </div>
              </div>

              {variantSaveSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{variantSaveSuccess}</span>
                </div>
              )}

              {/* Key Modifications & Prioritized Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl bg-[#1B1B22] border border-white/5 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] block">
                    Modifications Made
                  </span>
                  <ul className="space-y-1.5">
                    {variantDraft.key_modifications.map((m, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[#1B1B22] border border-white/5 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] block">
                    Verified Skills Prioritized
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {variantDraft.verified_skills_prioritized.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#0B0B0E] text-zinc-200 border border-white/5"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Options */}
              <div className="p-4 rounded-2xl bg-[#1B1B22] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div>
                  <span className="font-semibold text-white block mb-0.5">Persistence Preference:</span>
                  <p className="text-zinc-400">
                    Choose whether to branch as a brand-new resume document or append as a new version.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-white">
                    <input
                      type="radio"
                      name="save_mode"
                      checked={saveAsNewDoc}
                      onChange={() => setSaveAsNewDoc(true)}
                      className="accent-[#C91432]"
                    />
                    <span>New Document</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-white">
                    <input
                      type="radio"
                      name="save_mode"
                      checked={!saveAsNewDoc}
                      onChange={() => setSaveAsNewDoc(false)}
                      className="accent-[#C91432]"
                    />
                    <span>New Version of Existing</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Modal Diff */}
          <VariantComparisonModal
            isOpen={showDiffModal}
            onClose={() => setShowDiffModal(false)}
            diff={variantDiff}
          />
        </div>
      )}

      {/* TAB 2: Advanced AI Writing Assistant */}
      {activeTab === 'writing' && (
        <WritingAssistantPanel
          initialResumeId={selectedResumeId}
          initialRole={effectiveRole}
          geminiApiKey={apiKey}
        />
      )}

      {/* TAB 3: Personalized Career Roadmap */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#141419] border border-white/5 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#FF7417]" />
                Personalized Career Progression Roadmap
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Evaluates existing resume evidence to identify verified strengths, bridge critical skill gaps, and schedule structured milestones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                  Target Career Role
                </label>
                <input
                  type="text"
                  value={roadmapRole}
                  onChange={(e) => setRoadmapRole(e.target.value)}
                  placeholder="e.g. AI Developer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1B22] border border-white/10 text-white text-xs focus:outline-none focus:border-[#C91432]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                  Current Seniority Level
                </label>
                <input
                  type="text"
                  value={currentLevel}
                  onChange={(e) => setCurrentLevel(e.target.value)}
                  placeholder="e.g. Associate / Mid-level"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1B22] border border-white/10 text-white text-xs focus:outline-none focus:border-[#C91432]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                  Target Seniority Level
                </label>
                <input
                  type="text"
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(e.target.value)}
                  placeholder="e.g. Senior AI Developer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1B22] border border-white/10 text-white text-xs focus:outline-none focus:border-[#C91432]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleGenerateRoadmap}
                disabled={isGeneratingRoadmap}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#C91432] to-[#FF7417] text-white hover:opacity-90 transition shadow-lg shadow-[#C91432]/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isGeneratingRoadmap ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Synthesizing Roadmap...
                  </>
                ) : (
                  <>
                    <Compass className="w-4 h-4" />
                    Generate Personalized Roadmap
                  </>
                )}
              </button>
            </div>
          </div>

          {currentRoadmap && <CareerRoadmapView roadmap={currentRoadmap} />}
        </div>
      )}

      {/* TAB 4: Multi-Role Comparison Engine */}
      {activeTab === 'multi_role' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#141419] border border-white/5 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#FF7417]" />
                Multi-Role Comparison Engine
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Benchmark a single resume against 2 to 4 target roles simultaneously to uncover your strongest market fit and trade-offs.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-2">
                Select 2 - 4 Target Roles to Evaluate ({selectedRoles.length} selected)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESET_ROLES.map((role) => {
                  const isSelected = selectedRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRoleSelection(role)}
                      className={`p-3 rounded-xl text-xs font-medium border text-left transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#C91432]/20 border-[#C91432] text-white font-semibold'
                          : 'bg-[#1B1B22] border-white/5 text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      <span>{role}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#FF7417]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleMultiRoleCompare}
                disabled={isComparingRoles || !selectedResumeId || selectedRoles.length < 2}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#C91432] to-[#FF7417] text-white hover:opacity-90 transition shadow-lg shadow-[#C91432]/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isComparingRoles ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Evaluating Market Fits...
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    Compare {selectedRoles.length} Roles
                  </>
                )}
              </button>
            </div>
          </div>

          {multiRoleResult && (
            <MultiRoleMatrixView
              comparison={multiRoleResult}
              onGenerateVariant={(role) => {
                setTargetRole(role);
                setActiveTab('variants');
              }}
            />
          )}
        </div>
      )}

      {/* TAB 5: Portfolio Projects */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#141419] border border-white/5 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-[#FF7417]" />
                Project & Portfolio Recommendations
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Receive production-grade project blueprints designed to demonstrate in-demand competencies and bridge known skill gaps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                  Target Career Role
                </label>
                <input
                  type="text"
                  value={projectRole}
                  onChange={(e) => setProjectRole(e.target.value)}
                  placeholder="e.g. AI Developer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1B22] border border-white/10 text-white text-xs focus:outline-none focus:border-[#C91432]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                  Specific Skill Gaps to Target (Comma-separated)
                </label>
                <input
                  type="text"
                  value={skillGapsInput}
                  onChange={(e) => setSkillGapsInput(e.target.value)}
                  placeholder="e.g. PyTorch, Docker, Kubernetes, LangChain"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1B22] border border-white/10 text-white text-xs focus:outline-none focus:border-[#C91432]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleRecommendProjects}
                disabled={isRecommendingProjects}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#C91432] to-[#FF7417] text-white hover:opacity-90 transition shadow-lg shadow-[#C91432]/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isRecommendingProjects ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Designing Blueprints...
                  </>
                ) : (
                  <>
                    <FolderGit2 className="w-4 h-4" />
                    Recommend Showcase Projects
                  </>
                )}
              </button>
            </div>
          </div>

          {recommendedProjects.length > 0 && (
            <ProjectRecommendationsView
              projects={recommendedProjects}
              targetRole={projectRole}
            />
          )}
        </div>
      )}

      {/* TAB 6: Saved Roadmaps History */}
      {activeTab === 'saved_roadmaps' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#141419] border border-white/5 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-[#FF7417]" />
              Saved Career Progression Roadmaps ({savedRoadmaps.length})
            </h2>

            {isLoadingSavedRoadmaps ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                Loading saved roadmaps...
              </div>
            ) : savedRoadmaps.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                No saved roadmaps yet. Generate and save a roadmap to track your milestones here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedRoadmaps.map((r) => (
                  <div
                    key={r.id}
                    className="p-5 rounded-2xl bg-[#1B1B22] border border-white/5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{r.target_role}</span>
                      <span className="text-[10px] text-zinc-500">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {r.strengths.length} strengths evidenced • {r.skill_gaps.length} gaps identified •{' '}
                      {r.short_term_milestones.length} milestones
                    </p>
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentRoadmap(r);
                          setActiveTab('roadmap');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF7417]/20 text-[#FF9B45] hover:bg-[#FF7417]/30 transition"
                      >
                        View Full Roadmap
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
