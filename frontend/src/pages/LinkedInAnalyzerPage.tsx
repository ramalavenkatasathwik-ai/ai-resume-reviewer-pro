import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Globe,
  FileText,
  Type,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Search,
} from 'lucide-react';
import { linkedinService } from '@/services/linkedinService';
import { LinkedInAnalysisResult } from '@/types/linkedin';
import { AnalysisDashboard } from '@/components/dashboard';

const PRESET_ROLES = [
  'AI Developer',
  'Data Analyst',
  'Mechanical Design Engineer',
  'Automation Engineer',
  'Manufacturing Engineer',
  'Software Developer',
];

export const LinkedInAnalyzerPage: React.FC = () => {
  // Input mode
  const [activeTab, setActiveTab] = useState<'url' | 'pdf' | 'text'>('url');

  // Form states
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [targetRole, setTargetRole] = useState('AI Developer');
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  // Server-managed AI Model state
  const [selectedModel, setSelectedModel] = useState('gemini-4-argon');
  const [availableModels, setAvailableModels] = useState<string[]>([
    'gemini-4-argon',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ]);
  const [fallbackUrlText, setFallbackUrlText] = useState('');
  const [showFallbackAccordion, setShowFallbackAccordion] = useState(false);

  // URL Validation state
  const [urlValidationStatus, setUrlValidationStatus] = useState<{
    valid?: boolean;
    message?: string;
    normalizedUrl?: string;
  } | null>(null);

  // Key validation state
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState<{
    valid?: boolean;
    message?: string;
  } | null>(null);

  // Analysis execution states
  const [isLoading, setIsLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(1);
  const [progressMessage, setProgressMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unavailableData, setUnavailableData] = useState<{
    message: string;
    limitations?: string[];
    suggestedActions?: string[];
    normalizedUrl?: string;
  } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<LinkedInAnalysisResult | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load models on mount
  useEffect(() => {
    linkedinService.getSupportedModels().then((res) => {
      if (res.models && res.models.length > 0) {
        setAvailableModels(res.models);
        setSelectedModel(res.default_model || res.models[0]);
      }
    });
  }, []);

  // Multi-step progress simulation during loading
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setProgressStep(1);
      setProgressMessage('Validating profile input and checking data providers...');
      timer = setTimeout(() => {
        setProgressStep(2);
        setProgressMessage('Extracting verified credentials, history, and competencies...');
        timer = setTimeout(() => {
          setProgressStep(3);
          setProgressMessage(`Benchmarking profile evidence against ${targetRole} standards...`);
          timer = setTimeout(() => {
            setProgressStep(4);
            setProgressMessage('Synthesizing scores, rewritten descriptions, and 30-day plan...');
          }, 3500);
        }, 3000);
      }, 2500);
    }
    return () => clearTimeout(timer);
  }, [isLoading, targetRole]);

  // URL validity check
  const isUrlValid = (url: string) => {
    return linkedinService.validateProfileUrl(url).valid;
  };

  const handleValidateUrlClick = () => {
    if (!urlInput.trim()) {
      setUrlValidationStatus({
        valid: false,
        message: 'Please enter a LinkedIn profile URL.',
      });
      return;
    }
    const val = linkedinService.validateProfileUrl(urlInput);
    if (val.valid) {
      setUrlValidationStatus({
        valid: true,
        message: `Valid LinkedIn profile URL (${val.normalizedUrl})`,
        normalizedUrl: val.normalizedUrl,
      });
      setErrorMessage(null);
    } else {
      setUrlValidationStatus({
        valid: false,
        message: val.error || 'Invalid LinkedIn URL format.',
      });
    }
  };

  const handleKeyProbe = async () => {
    setIsValidatingKey(true);
    setKeyValidationStatus(null);
    try {
      const res = await linkedinService.validateKey(selectedModel);
      setKeyValidationStatus({ valid: res.valid, message: res.message });
    } catch (err: unknown) {
      let msg = 'Connection probe failed.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.message || err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setKeyValidationStatus({ valid: false, message: msg });
    } finally {
      setIsValidatingKey(false);
    }
  };

  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Please upload a PDF file (.pdf) generated by LinkedIn.');
        return;
      }
      if (file.size === 0) {
        setErrorMessage('Uploaded PDF file is empty (0 bytes). Please upload a valid document.');
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 10 MB.`);
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Please upload a PDF file (.pdf) generated by LinkedIn.');
        return;
      }
      if (file.size === 0) {
        setErrorMessage('Uploaded PDF file is empty (0 bytes). Please upload a valid document.');
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 10 MB.`);
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleAnalyze = async () => {
    if (isLoading) return;
    const effectiveRole = isCustomRole ? customRoleInput.trim() : targetRole;
    if (!effectiveRole) {
      setErrorMessage('Please specify a target career role.');
      return;
    }

    setErrorMessage(null);
    setUnavailableData(null);
    setIsLoading(true);

    try {
      let result: LinkedInAnalysisResult;

      if (activeTab === 'url') {
        const val = linkedinService.validateProfileUrl(urlInput);
        if (!val.valid) {
          const err =
            val.error ||
            'Please provide a valid LinkedIn personal profile URL (e.g., https://www.linkedin.com/in/username).';
          setErrorMessage(err);
          setUrlValidationStatus({ valid: false, message: err });
          setIsLoading(false);
          return;
        }
        result = await linkedinService.analyzeUrl({
          linkedin_url: val.normalizedUrl || urlInput.trim(),
          url: val.normalizedUrl || urlInput.trim(),
          target_role: effectiveRole,
          model: selectedModel,
          profile_text: fallbackUrlText.trim() || undefined,
          fallback_text: fallbackUrlText.trim() || undefined,
        });
      } else if (activeTab === 'pdf') {
        if (!selectedFile) {
          setErrorMessage('Please upload a LinkedIn-generated PDF export.');
          setIsLoading(false);
          return;
        }
        result = await linkedinService.analyzePdf(
          selectedFile,
          effectiveRole,
          selectedModel,
          urlInput.trim() || undefined
        );
      } else {
        if (textInput.trim().length < 50) {
          setErrorMessage('Pasted profile text must contain at least 50 characters.');
          setIsLoading(false);
          return;
        }
        result = await linkedinService.analyzeText({
          profile_text: textInput.trim(),
          target_role: effectiveRole,
          model: selectedModel,
          profile_url: urlInput.trim() || undefined,
        });
      }

      setAnalysisResult(result);
      setUnavailableData(null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        if (status === 422 || detail?.error === 'PROFILE_DATA_UNAVAILABLE') {
          setUnavailableData({
            message:
              (typeof detail === 'object' ? detail?.message : detail) ||
              'A URL alone did not provide the profile content due to LinkedIn access controls.',
            limitations: (typeof detail === 'object' ? detail?.limitations : []) || [],
            suggestedActions: (typeof detail === 'object' ? detail?.suggested_actions : []) || [],
            normalizedUrl: (typeof detail === 'object' ? detail?.normalized_profile_url : undefined) || urlInput,
          });
          setAnalysisResult(null);
          return;
        }

        const msg =
          (typeof detail === 'object' ? detail?.message : detail) ||
          err.response?.data?.message ||
          err.message ||
          'An unexpected error occurred during profile analysis. Please check your credentials and retry.';
        setErrorMessage(msg);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred during profile analysis.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#FF7417] selection:text-black">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-[#282834]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E1E26] border border-[#282834] text-xs font-semibold text-[#FF7417] uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#F04452]" />
            Official BYOK Profile Intelligence
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            LinkedIn Profile <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F04452] to-[#FF7417]">Analyzer Pro</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl">
            Audit your LinkedIn headline, summary, work experience, and competencies against strict recruiter filters and target job benchmarks.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {!analysisResult ? (
          <>
            {/* Input Config Card */}
            <div className="bg-[#141419] rounded-2xl border border-[#282834] shadow-2xl overflow-hidden p-6 sm:p-8 space-y-8">
              {/* Mode Tabs */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Select Profile Input Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('url')}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all border ${
                      activeTab === 'url'
                        ? 'bg-[#1E1E26] border-[#F04452] text-white shadow-[0_0_15px_rgba(240,68,82,0.2)]'
                        : 'bg-[#0B0B0E] border-[#282834] text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    <Globe className={`w-4 h-4 ${activeTab === 'url' ? 'text-[#FF7417]' : ''}`} />
                    Mode 1: LinkedIn URL
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('pdf')}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all border ${
                      activeTab === 'pdf'
                        ? 'bg-[#1E1E26] border-[#F04452] text-white shadow-[0_0_15px_rgba(240,68,82,0.2)]'
                        : 'bg-[#0B0B0E] border-[#282834] text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    <FileText className={`w-4 h-4 ${activeTab === 'pdf' ? 'text-[#FF7417]' : ''}`} />
                    Mode 2: LinkedIn PDF Export
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('text')}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all border ${
                      activeTab === 'text'
                        ? 'bg-[#1E1E26] border-[#F04452] text-white shadow-[0_0_15px_rgba(240,68,82,0.2)]'
                        : 'bg-[#0B0B0E] border-[#282834] text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    <Type className={`w-4 h-4 ${activeTab === 'text' ? 'text-[#FF7417]' : ''}`} />
                    Fallback: Pasted Text
                  </button>
                </div>
              </div>

              {/* Mode 1: URL Input */}
              {activeTab === 'url' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="linkedin-url-input" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Public LinkedIn Profile URL
                      </label>
                      {urlInput && (
                        <span
                          className={`text-[11px] font-semibold flex items-center gap-1 ${
                            isUrlValid(urlInput) ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {isUrlValid(urlInput) ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid profile link
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" /> Must be linkedin.com/in/username
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Globe className="w-4 h-4" />
                        </div>
                        <input
                          id="linkedin-url-input"
                          type="url"
                          value={urlInput}
                          onChange={(e) => {
                            setUrlInput(e.target.value);
                            setUrlValidationStatus(null);
                          }}
                          placeholder="https://www.linkedin.com/in/your-profile-slug"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0B0B0E] border border-[#282834] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FF7417] focus:ring-1 focus:ring-[#FF7417] font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleValidateUrlClick}
                        data-testid="validate-url-button"
                        className="px-5 py-3 rounded-xl bg-[#1E1E26] hover:bg-[#282834] border border-[#282834] text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2 shrink-0"
                      >
                        <Search className="w-3.5 h-3.5 text-[#FF7417]" />
                        <span>Validate URL</span>
                      </button>
                    </div>

                    {urlValidationStatus && (
                      <div
                        data-testid="url-validation-feedback"
                        className={`mt-2 p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                          urlValidationStatus.valid
                            ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                            : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                        }`}
                      >
                        {urlValidationStatus.valid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-[#F04452] shrink-0" />
                        )}
                        <span>{urlValidationStatus.message}</span>
                      </div>
                    )}

                    <p className="mt-2 text-xs text-slate-400 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#FF7417] mt-0.5 shrink-0" />
                      <span>
                        Note: Because LinkedIn enforces authentication walls for member profiles, direct URL access requires approved API permissions. If direct access is blocked, you can easily paste your profile text below or upload an official <strong>LinkedIn PDF</strong> export.
                      </span>
                    </p>
                  </div>

                  {/* Optional Fallback Text Toggle */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowFallbackAccordion(!showFallbackAccordion)}
                      className="text-xs font-semibold text-[#FF7417] hover:text-[#FFA05C] flex items-center gap-1 transition-colors"
                    >
                      {showFallbackAccordion ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      Optional: Add profile text / fallback content
                    </button>
                    {showFallbackAccordion && (
                      <div className="mt-2">
                        <textarea
                          id="fallback-text-input"
                          rows={4}
                          value={fallbackUrlText}
                          onChange={(e) => setFallbackUrlText(e.target.value)}
                          placeholder="Paste any headline, About summary, work experience, or skills to combine with the URL analysis..."
                          className="w-full p-3 rounded-xl bg-[#0B0B0E] border border-[#282834] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF7417] font-mono leading-relaxed"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: PDF Upload */}
              {activeTab === 'pdf' && (
                <div className="space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Upload LinkedIn "Save to PDF" Export
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-[#FF7417] bg-[#FF7417]/5'
                        : selectedFile
                        ? 'border-emerald-500/50 bg-[#1E1E26]'
                        : 'border-[#282834] bg-[#0B0B0E] hover:border-slate-600'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                          <FileCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                            }}
                            className="px-3 py-1 rounded-lg bg-[#282834] text-xs text-rose-400 hover:bg-rose-500/20 font-semibold"
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="px-3 py-1 rounded-lg bg-[#282834] text-xs text-slate-200 hover:bg-[#3A3A4A] font-semibold"
                          >
                            Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-[#1E1E26] text-[#FF7417] flex items-center justify-center mx-auto">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-white">
                          Drag and drop your LinkedIn PDF here, or <span className="text-[#FF7417]">browse</span>
                        </h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          On your LinkedIn profile page, click <strong>More &gt; Save to PDF</strong> to generate your official PDF export.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode 3: Pasted Text */}
              {activeTab === 'text' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Paste Profile Content
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {textInput.length} chars (min 50)
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste headline, About section, experience roles, and skills directly from your LinkedIn profile..."
                    className="w-full p-4 rounded-xl bg-[#0B0B0E] border border-[#282834] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF7417] font-mono leading-relaxed"
                  />
                </div>
              )}

              {/* Target Role Selector */}
              <div className="space-y-3 pt-4 border-t border-[#282834]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Target Role Benchmark
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomRole(!isCustomRole)}
                    className="text-xs font-semibold text-[#FF7417] hover:underline"
                  >
                    {isCustomRole ? 'Choose preset role' : 'Enter custom role'}
                  </button>
                </div>

                {!isCustomRole ? (
                  <div className="flex flex-wrap gap-2">
                    {PRESET_ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setTargetRole(role)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                          targetRole === role
                            ? 'bg-gradient-to-r from-[#C91432] to-[#FF7417] text-white border-transparent shadow-md'
                            : 'bg-[#0B0B0E] border-[#282834] text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customRoleInput}
                    onChange={(e) => setCustomRoleInput(e.target.value)}
                    placeholder="e.g. Lead Robotics Engineer, Cloud Solutions Architect..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0E] border border-[#282834] text-sm text-white focus:outline-none focus:border-[#FF7417]"
                  />
                )}
              </div>

              {/* Secure BYOK Key & Model Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[#282834]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Server-Side AI Engine
                    </label>
                    <button
                      type="button"
                      disabled={isValidatingKey}
                      onClick={handleKeyProbe}
                      className="text-[11px] text-[#FF7417] hover:underline flex items-center gap-1 font-semibold"
                    >
                      {isValidatingKey ? 'Testing AI connection...' : 'Test AI Connection'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0B0B0E] border border-[#282834]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold text-white">Centralized AI Service Active</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono font-medium">
                      Managed Server-Side
                    </span>
                  </div>

                  {keyValidationStatus && (
                    <p
                      className={`text-[11px] font-semibold mt-1.5 flex items-center gap-1 ${
                        keyValidationStatus.valid ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {keyValidationStatus.valid ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {keyValidationStatus.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Verified Gemini Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0E] border border-[#282834] text-xs text-white focus:outline-none focus:border-[#FF7417]"
                  >
                    {availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m} {m === 'gemini-4-argon' ? '(Default Server Frontier Model)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Secure server configuration: Zero user keys required. All requests processed securely.
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 flex items-start gap-3 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-[#F04452] mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold text-rose-200">Analysis Error</p>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Unavailable Profile Data State (HTTP 422) */}
              {unavailableData && (
                <div
                  data-testid="unavailable-data-panel"
                  className="bg-[#141419] rounded-2xl border-2 border-[#C91432]/70 shadow-[0_0_30px_rgba(201,20,50,0.25)] p-6 sm:p-8 space-y-6 animate-fade-in"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#C91432]/20 border border-[#C91432] text-[#F04452] flex items-center justify-center shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#C91432]/30 text-[#F04452] border border-[#C91432]/50">
                          Profile Inaccessible via URL
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#1E1E26] text-slate-400 border border-[#282834]">
                          Ethical BYOK Compliance
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        A URL alone did not provide the profile content
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {unavailableData.message}
                      </p>
                    </div>
                  </div>

                  {/* Ethical Zero-Hallucination Policy Guarantee */}
                  <div className="bg-[#1C1C23] border border-[#303038] rounded-xl p-4 flex items-center gap-3 text-xs text-slate-300">
                    <ShieldCheck className="w-5 h-5 text-[#FF7417] shrink-0" />
                    <div>
                      <span className="font-bold text-[#F7F7FA]">Zero Fabricated Scores: </span>
                      <span>
                        In accordance with our strict AI ethics policy, we never generate fake scores or hallucinate missing candidate data when profile content is unavailable.
                      </span>
                    </div>
                  </div>

                  {/* Limitations if provided */}
                  {unavailableData.limitations && unavailableData.limitations.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1.5 text-xs">
                      <p className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[#FF7417]" /> Detected Access Limitations:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                        {unavailableData.limitations.map((lim, idx) => (
                          <li key={idx}>{lim}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fallback Action Choices */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Fallback 1: Switch to PDF Upload */}
                    <div className="bg-[#0B0B0E] border border-[#303038] rounded-xl p-5 space-y-3 flex flex-col justify-between hover:border-[#FF7417] transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[#FF7417]">
                          <UploadCloud className="w-5 h-5" />
                          <h4 className="text-sm font-bold text-white">Option 1: Upload LinkedIn PDF (Recommended)</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          On LinkedIn, click <strong>More &gt; Save to PDF</strong> to download your full official profile with all experience bullets and skills.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('pdf');
                          setUnavailableData(null);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#C91432] to-[#FF7417] text-white text-xs font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2"
                      >
                        <span>Switch to PDF Upload</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Fallback 2: Paste Profile Text */}
                    <div className="bg-[#0B0B0E] border border-[#303038] rounded-xl p-5 space-y-3 flex flex-col justify-between hover:border-[#FF7417] transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[#FF7417]">
                          <Type className="w-5 h-5" />
                          <h4 className="text-sm font-bold text-white">Option 2: Paste Profile Text</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Paste your headline, About summary, experience roles, and skills directly to perform the comprehensive analysis.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowFallbackAccordion(true);
                          const el = document.getElementById('fallback-text-input');
                          el?.focus();
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#1E1E26] hover:bg-[#282834] border border-[#303038] text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <span>Paste Profile Text</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button & Loading Progress */}
              <div className="pt-4 border-t border-[#282834]">
                {isLoading ? (
                  <div className="bg-[#0B0B0E] border border-[#282834] rounded-2xl p-6 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full border-2 border-[#FF7417] border-t-transparent animate-spin mx-auto" />
                    <div>
                      <p className="text-xs uppercase font-mono tracking-widest text-[#FF7417]">
                        Step {progressStep} of 4
                      </p>
                      <h4 className="text-sm font-bold text-white mt-1">{progressMessage}</h4>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full max-w-md bg-[#1E1E26] h-2 rounded-full mx-auto overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#F04452] to-[#FF7417] h-full transition-all duration-700 ease-out"
                        style={{ width: `${progressStep * 25}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    data-testid="analyze-profile-button"
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#C91432] via-[#F04452] to-[#FF7417] text-white font-extrabold text-sm shadow-[0_0_25px_rgba(240,68,82,0.35)] hover:shadow-[0_0_35px_rgba(255,116,23,0.5)] transition-all flex items-center justify-center gap-2"
                  >
                    <span>Analyze LinkedIn Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <AnalysisDashboard
            result={analysisResult}
            onNewAnalysis={() => {
              setAnalysisResult(null);
              setErrorMessage(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default LinkedInAnalyzerPage;
