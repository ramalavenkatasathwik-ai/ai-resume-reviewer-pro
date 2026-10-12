import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Globe,
  FileText,
  Type,
  KeyRound,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Printer,
  RotateCcw,
  UploadCloud,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  Briefcase,
  Layers,
  Search,
  Calendar,
} from 'lucide-react';
import { linkedinService } from '@/services/linkedinService';
import { LinkedInAnalysisResult } from '@/types/linkedin';

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
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem('gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState<string[]>([
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

  // Accordion toggle states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    headline: true,
    about: true,
    experience: true,
    skills: true,
    alignment: true,
    actionPlan: true,
  });

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
    if (!apiKey.trim()) return;
    setIsValidatingKey(true);
    setKeyValidationStatus(null);
    try {
      const res = await linkedinService.validateKey(apiKey.trim(), selectedModel);
      setKeyValidationStatus({ valid: res.valid, message: res.message });
    } catch (err: unknown) {
      let msg = 'Key validation failed.';
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
    const effectiveRole = isCustomRole ? customRoleInput.trim() : targetRole;
    if (!effectiveRole) {
      setErrorMessage('Please specify a target career role.');
      return;
    }
    if (!apiKey.trim()) {
      setErrorMessage('Please enter your Google Gemini API key (BYOK) to proceed.');
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
        result = await linkedinService.analyzeUrl(
          {
            linkedin_url: val.normalizedUrl || urlInput.trim(),
            url: val.normalizedUrl || urlInput.trim(),
            target_role: effectiveRole,
            model: selectedModel,
            profile_text: fallbackUrlText.trim() || undefined,
            fallback_text: fallbackUrlText.trim() || undefined,
          },
          apiKey.trim()
        );
      } else if (activeTab === 'pdf') {
        if (!selectedFile) {
          setErrorMessage('Please upload a LinkedIn-generated PDF export.');
          setIsLoading(false);
          return;
        }
        result = await linkedinService.analyzePdf(
          selectedFile,
          effectiveRole,
          apiKey.trim(),
          selectedModel,
          urlInput.trim() || undefined
        );
      } else {
        if (textInput.trim().length < 50) {
          setErrorMessage('Pasted profile text must contain at least 50 characters.');
          setIsLoading(false);
          return;
        }
        result = await linkedinService.analyzeText(
          {
            profile_text: textInput.trim(),
            target_role: effectiveRole,
            model: selectedModel,
            profile_url: urlInput.trim() || undefined,
          },
          apiKey.trim()
        );
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

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const printReport = () => {
    window.print();
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

        {analysisResult && (
          <div className="flex items-center gap-3">
            <button
              onClick={printReport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E1E26] hover:bg-[#282834] border border-[#282834] text-xs font-bold text-slate-200 transition-colors"
            >
              <Printer className="w-4 h-4 text-[#FF7417]" />
              Print / Save PDF Report
            </button>
            <button
              onClick={() => {
                setAnalysisResult(null);
                setErrorMessage(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#141419] hover:bg-[#1E1E26] border border-[#282834] text-xs font-bold text-slate-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New Analysis
            </button>
          </div>
        )}
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
                      Gemini API Key (BYOK)
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#FF7417] hover:underline flex items-center gap-1"
                    >
                      Get free key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setKeyValidationStatus(null);
                      }}
                      placeholder="Paste AIzaSy... key"
                      className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-[#0B0B0E] border border-[#282834] text-xs text-white focus:outline-none focus:border-[#FF7417] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-12 pr-2 flex items-center text-slate-500 hover:text-slate-300 text-[11px] font-semibold"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      disabled={!apiKey.trim() || isValidatingKey}
                      onClick={handleKeyProbe}
                      className="absolute inset-y-1.5 right-1.5 px-2.5 py-1 rounded-lg bg-[#282834] hover:bg-[#3A3A4A] text-slate-200 text-[10px] font-bold disabled:opacity-50"
                    >
                      {isValidatingKey ? 'Testing...' : 'Test'}
                    </button>
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
                        {m} {m === 'gemini-2.5-flash' ? '(Recommended - Fast & GA)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Ephemeral execution: Key is strictly request-scoped and never saved.
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
          /* ========================================================== */
          /* COMPLETE RESULTS VIEW                                      */
          /* ========================================================== */
          <div className="space-y-8 animate-fade-in print:text-black">
            {/* Candidate Identity Header */}
            <div className="bg-[#141419] rounded-2xl border border-[#282834] p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#1E1E26] text-[#FF7417] border border-[#282834]">
                    Mode: {analysisResult.input_type.toUpperCase()}
                  </span>
                  {analysisResult.original_filename && (
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#1E1E26] text-slate-300 border border-[#282834]">
                      File: {analysisResult.original_filename}
                    </span>
                  )}
                  {analysisResult.extraction_method && (
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                      Extraction: {analysisResult.extraction_method === 'gemini_multimodal_pdf' ? 'Multimodal Vision' : 'Embedded PDF Text'}
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                    Target: {analysisResult.target_role}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Model: {analysisResult.model_used}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {analysisResult.profile_identity?.name || 'Candidate Profile'}
                </h2>

                <p className="text-sm text-slate-300 max-w-2xl font-medium">
                  {analysisResult.profile_identity?.headline || 'No headline specified in input'}
                </p>

                {analysisResult.profile_identity?.location && (
                  <p className="text-xs text-slate-400">
                    📍 {analysisResult.profile_identity.location} • {analysisResult.profile_identity.industry || 'Tech'}
                  </p>
                )}
              </div>

              {/* Overall Score Badge */}
              <div className="bg-[#0B0B0E] border border-[#282834] rounded-2xl p-6 text-center min-w-[200px]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Overall Profile Score
                </span>
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F04452] to-[#FF7417] mt-1">
                  {analysisResult.overall_score.score}
                  <span className="text-sm text-slate-500 font-normal">/100</span>
                </div>
                <p className="text-xs text-slate-300 mt-2 font-medium">
                  {analysisResult.overall_score.score >= 85
                    ? 'Exceptional Alignment'
                    : analysisResult.overall_score.score >= 70
                    ? 'Competitive Profile'
                    : 'Needs Strategic Polish'}
                </p>
              </div>
            </div>

            {/* Coverage Indicator Card */}
            <div className="bg-[#141419] rounded-2xl border border-[#282834] p-6 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#FF7417]" />
                  <h3 className="text-sm font-bold text-white">
                    Profile Evidence Coverage: {analysisResult.coverage_information.coverage_percentage}%
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {analysisResult.coverage_information.assessed_sections_count} of{' '}
                  {analysisResult.coverage_information.total_possible_sections} standard sections evaluated
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#0B0B0E] h-2.5 rounded-full overflow-hidden border border-[#282834]">
                <div
                  className="bg-gradient-to-r from-[#C91432] via-[#F04452] to-[#FF7417] h-full"
                  style={{ width: `${analysisResult.coverage_information.coverage_percentage}%` }}
                />
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {analysisResult.coverage_information.calculation_methodology}
              </p>

              {analysisResult.limitations && analysisResult.limitations.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Note on Access Limitations:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
                    {analysisResult.limitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 10 Section Scores Grid */}
            <div>
              <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FF7417]" />
                Section Score Breakdown (0 - 100)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(analysisResult.section_scores).map(([key, val]) => (
                  <div
                    key={key}
                    className="bg-[#141419] rounded-xl border border-[#282834] p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold capitalize text-slate-400">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-md ${
                            val.score >= 85
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : val.score >= 70
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {val.score}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                        {val.explanation}
                      </p>
                    </div>
                    {val.recommended_actions?.[0] && (
                      <p className="text-[10px] text-[#FF7417] mt-3 pt-2 border-t border-[#282834] font-medium line-clamp-2">
                        💡 {val.recommended_actions[0]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Section Analyses (Accordions) */}
            <div className="space-y-4">
              {/* 1. Headline Analysis */}
              <div className="bg-[#141419] rounded-2xl border border-[#282834] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('headline')}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#1E1E26] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FF7417]/10 text-[#FF7417] flex items-center justify-center font-bold">
                      H
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Headline & Identity Positioning</h4>
                      <p className="text-xs text-slate-400">Keywords, value proposition, and suggested rewrites</p>
                    </div>
                  </div>
                  {expandedSections.headline ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expandedSections.headline && (
                  <div className="p-6 border-t border-[#282834] space-y-5 text-xs text-slate-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#282834] space-y-2">
                        <p className="font-bold text-slate-200">Clarity & Value Proposition</p>
                        <p className="leading-relaxed">{analysisResult.headline_analysis.clarity_and_specificity}</p>
                        <p className="text-slate-400 mt-2 font-medium">{analysisResult.headline_analysis.value_proposition}</p>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#282834] space-y-2">
                        <p className="font-bold text-slate-200">Role Alignment & Keywords</p>
                        <p className="leading-relaxed">{analysisResult.headline_analysis.target_role_alignment}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {analysisResult.headline_analysis.relevant_keywords.map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-[#1E1E26] text-[#FF7417] font-mono text-[10px]">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Suggested Headline Variations */}
                    <div>
                      <p className="font-bold text-white text-xs uppercase tracking-wider mb-2">
                        Suggested Improved Headlines (Optimized for Recruiter Search)
                      </p>
                      <div className="space-y-2">
                        {analysisResult.headline_analysis.suggested_improved_headlines.map((hl, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-[#0B0B0E] border border-[#282834] flex items-center justify-between gap-3 group"
                          >
                            <p className="font-mono text-slate-200 text-xs">{hl}</p>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(hl, `headline-${idx}`)}
                              className="px-2.5 py-1 rounded bg-[#1E1E26] hover:bg-[#282834] text-slate-300 text-[11px] font-semibold shrink-0 flex items-center gap-1 transition-colors"
                            >
                              {copiedKey === `headline-${idx}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" /> Copy
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. About Section Analysis */}
              <div className="bg-[#141419] rounded-2xl border border-[#282834] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('about')}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#1E1E26] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F04452]/10 text-[#F04452] flex items-center justify-center font-bold">
                      A
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">About Section & Narrative Impact</h4>
                      <p className="text-xs text-slate-400">Career story, quantifiable metrics, and full rewritten summary</p>
                    </div>
                  </div>
                  {expandedSections.about ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expandedSections.about && (
                  <div className="p-6 border-t border-[#282834] space-y-5 text-xs text-slate-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#282834] space-y-2">
                        <p className="font-bold text-slate-200">Career Narrative & Identity</p>
                        <p className="leading-relaxed">
                          {analysisResult.about_analysis.career_narrative || 'No career narrative was observed.'}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#282834] space-y-2">
                        <p className="font-bold text-slate-200">Impact & Missing Information</p>
                        <p className="leading-relaxed">
                          {analysisResult.about_analysis.evidence_of_impact || 'Impact statements are lacking.'}
                        </p>
                        {analysisResult.about_analysis.missing_information.length > 0 && (
                          <ul className="list-disc list-inside text-rose-300 mt-2 space-y-0.5">
                            {analysisResult.about_analysis.missing_information.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {analysisResult.about_analysis.suggested_rewritten_about && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-white text-xs uppercase tracking-wider">
                            Suggested Rewritten About Section
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                analysisResult.about_analysis.suggested_rewritten_about || '',
                                'about-rewrite'
                              )
                            }
                            className="px-2.5 py-1 rounded bg-[#1E1E26] hover:bg-[#282834] text-slate-200 text-[11px] font-semibold flex items-center gap-1"
                          >
                            {copiedKey === 'about-rewrite' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy Summary
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#282834] whitespace-pre-line font-mono text-slate-300 leading-relaxed text-xs">
                          {analysisResult.about_analysis.suggested_rewritten_about}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Work Experience Breakdown */}
              <div className="bg-[#141419] rounded-2xl border border-[#282834] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('experience')}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#1E1E26] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Experience & Role Achievements</h4>
                      <p className="text-xs text-slate-400">
                        {analysisResult.experience_analysis.roles_analyzed_count} roles analyzed with quantifiable outcome assessments
                      </p>
                    </div>
                  </div>
                  {expandedSections.experience ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expandedSections.experience && (
                  <div className="p-6 border-t border-[#282834] space-y-6 text-xs text-slate-300">
                    {analysisResult.experience_analysis.roles.map((role, idx) => (
                      <div key={idx} className="p-5 rounded-xl bg-[#0B0B0E] border border-[#282834] space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-3 border-b border-[#282834]">
                          <div>
                            <h5 className="text-sm font-bold text-white">{role.job_title}</h5>
                            <p className="text-xs text-[#FF7417] font-semibold">{role.organization}</p>
                          </div>
                          {role.dates && (
                            <span className="text-[11px] font-mono text-slate-500">{role.dates}</span>
                          )}
                        </div>

                        {role.achievements.length > 0 && (
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

                        {role.quantifiable_outcomes.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {role.quantifiable_outcomes.map((out, i) => (
                              <span key={i} className="px-2.5 py-1 rounded bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-[11px] font-mono">
                                📈 {out}
                              </span>
                            ))}
                          </div>
                        )}

                        {role.suggested_rewritten_description && (
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold text-[#FF7417] uppercase tracking-wider">
                                Suggested High-Impact Bullet Rewrite
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(role.suggested_rewritten_description || '', `role-${idx}`)
                                }
                                className="px-2 py-0.5 rounded bg-[#1E1E26] hover:bg-[#282834] text-slate-300 text-[10px] font-semibold flex items-center gap-1"
                              >
                                {copiedKey === `role-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                Copy
                              </button>
                            </div>
                            <p className="p-3 rounded-lg bg-[#141419] border border-[#282834] text-slate-200 font-mono text-[11px]">
                              {role.suggested_rewritten_description}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Skills & Keyword Optimization */}
              <div className="bg-[#141419] rounded-2xl border border-[#282834] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('skills')}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#1E1E26] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Skills Matrix & Keyword Search Optimization</h4>
                      <p className="text-xs text-slate-400">Demonstrated competencies, critical missing keywords, and search filters</p>
                    </div>
                  </div>
                  {expandedSections.skills ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expandedSections.skills && (
                  <div className="p-6 border-t border-[#282834] space-y-6 text-xs text-slate-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#282834] space-y-3">
                        <p className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                          ✓ Role-Relevant & Evidenced Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisResult.skills_analysis.role_relevant_skills.map((s, i) => (
                            <span key={i} className="px-2.5 py-1 rounded bg-[#1E1E26] text-slate-200 border border-[#282834] font-mono text-[11px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#282834] space-y-3">
                        <p className="font-bold text-rose-400 uppercase tracking-wider text-[11px]">
                          ⚠ Critical Missing Keywords for {analysisResult.target_role}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisResult.keyword_analysis.missing_critical_keywords.map((kw, i) => (
                            <span key={i} className="px-2.5 py-1 rounded bg-rose-950/40 border border-rose-800 text-rose-300 font-mono text-[11px]">
                              +{kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#282834] space-y-2">
                      <p className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                        Strategic Keyword Placement Advice
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {analysisResult.keyword_analysis.strategic_placement_advice.map((adv, i) => (
                          <li key={i}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. 30-Day Prioritized Action Plan */}
              <div className="bg-[#141419] rounded-2xl border border-[#282834] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('actionPlan')}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#1E1E26] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FF7417]/10 text-[#FF7417] flex items-center justify-center font-bold">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Prioritized 30-Day Profile Improvement Plan</h4>
                      <p className="text-xs text-slate-400">Step-by-step roadmap to maximize recruiter visibility and outreach</p>
                    </div>
                  </div>
                  {expandedSections.actionPlan ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expandedSections.actionPlan && (
                  <div className="p-6 border-t border-[#282834] space-y-4 text-xs text-slate-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {analysisResult.target_role_alignment.prioritized_30_day_plan.map((week) => (
                        <div
                          key={week.week}
                          className="p-4 rounded-xl bg-[#0B0B0E] border border-[#282834] space-y-3 flex flex-col justify-between"
                        >
                          <div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E1E26] text-[#FF7417] font-bold">
                              WEEK {week.week}
                            </span>
                            <h6 className="text-sm font-bold text-white mt-2">{week.focus_title}</h6>
                            <ul className="mt-3 space-y-2 text-slate-300">
                              {week.action_items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-[#F04452] font-bold">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Advisory Disclaimer Banner */}
            <div className="p-5 rounded-2xl bg-[#141419] border border-[#282834] text-xs text-slate-400 leading-relaxed space-y-1">
              <p className="font-bold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#FF7417]" /> Advisory Evaluation Notice
              </p>
              <p>{analysisResult.disclaimer}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkedInAnalyzerPage;
