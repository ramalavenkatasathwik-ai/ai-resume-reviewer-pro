import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Linkedin,
  Sparkles,
  ArrowRight,
  Server,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Cpu,
  KeyRound,
  FileCheck2,
} from 'lucide-react';
import { ConnectionStatus, HealthResponse } from '@/types/api';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';

interface LandingPageProps {
  status: ConnectionStatus;
  data: HealthResponse | null;
  error: string | null;
  lastChecked: Date | null;
  onRefresh: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  status,
  data,
  error,
  lastChecked,
  onRefresh,
}) => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  useEffect(() => {
    try {
      const key = localStorage.getItem('gemini_api_key');
      setHasApiKey(Boolean(key && key.trim().length > 0));
    } catch {
      setHasApiKey(false);
    }
  }, []);

  return (
    <div className="space-y-12 sm:space-y-16 py-4 sm:py-8 max-w-6xl mx-auto">
      {/* Hero Section */}
      <section className="text-center relative">
        {/* Subtle radial glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C91432]/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C1C23] border border-[#303038] text-xs font-semibold uppercase tracking-wider mb-6 text-[#FF9B45]">
          <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
          <span>Production AI Career Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#F7F7FA] tracking-tight leading-[1.1]">
          AI Resume Reviewer{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C91432] via-[#F04452] to-[#FF7417]">
            & LinkedIn Analyzer Pro
          </span>
        </h1>

        <p className="mt-5 text-xl sm:text-2xl text-[#A1A1AA] font-medium max-w-3xl mx-auto leading-relaxed">
          AI-powered Resume, ATS and Career Analysis
        </p>

        <p className="mt-3 text-sm sm:text-base text-[#A1A1AA]/80 max-w-2xl mx-auto">
          Benchmark resumes and LinkedIn profiles against real industry expectations using Google Gemini.
          Private BYOK security guarantees your API keys and profile documents never persist on our servers.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link to="/dashboard">
            <PrimaryButton
              variant="crimson"
              size="lg"
              className="group shadow-lg shadow-[#C91432]/25"
            >
              <FileText className="w-4 h-4" />
              <span>Launch Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </PrimaryButton>
          </Link>

          <Link to="/linkedin">
            <PrimaryButton
              variant="orange"
              size="lg"
              className="group shadow-lg shadow-[#FF7417]/25"
            >
              <Linkedin className="w-4 h-4" />
              <span>Analyze LinkedIn</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </PrimaryButton>
          </Link>

          <Link to="/settings">
            <SecondaryButton size="lg" className="border-[#303038]">
              <KeyRound className="w-4 h-4 text-[#FF7417]" />
              <span>Configure Settings</span>
            </SecondaryButton>
          </Link>
        </div>

        {/* Quick API Key status banner */}
        <div className="mt-6 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141419] border border-[#303038] text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                hasApiKey ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-[#A1A1AA]">Gemini BYOK Key:</span>
            {hasApiKey ? (
              <span className="text-emerald-400 font-semibold">Configured</span>
            ) : (
              <Link
                to="/settings"
                className="text-[#FF7417] hover:underline font-semibold"
              >
                Not configured &mdash; Add key &rarr;
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Main Dual Feature Launch Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Resume Analyzer */}
        <div className="interactive-card rounded-2xl bg-[#141419] border border-[#303038] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C91432]/5 rounded-bl-full pointer-events-none group-hover:bg-[#C91432]/10 transition-colors" />

          <div>
            <div className="w-12 h-12 rounded-xl bg-[#C91432]/15 border border-[#C91432]/30 flex items-center justify-center text-[#F04452] mb-5">
              <FileText className="w-6 h-6" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-[#F7F7FA]">Resume Analyzer</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#C91432]/20 text-[#F04452] uppercase font-mono">
                ATS Tested
              </span>
            </div>

            <p className="text-sm text-[#A1A1AA] leading-relaxed mb-6">
              Upload your PDF resume to receive comprehensive 0–100 ATS scoring, keyword alignment audits,
              metric-driven bullet rewrites, and role-specific interview preparation questions.
            </p>

            <ul className="space-y-2.5 text-xs text-[#A1A1AA] mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF7417]" />
                <span>Applicant Tracking System (ATS) parsability scoring</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF7417]" />
                <span>Missing skills & keyword density audit</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF7417]" />
                <span>Impact-driven achievement bullet rewrites</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF7417]" />
                <span>Target role interview preparation questions</span>
              </li>
            </ul>
          </div>

          <div>
            <Link to="/dashboard" className="block">
              <PrimaryButton variant="crimson" className="w-full justify-between">
                <span>Open Resume Analyzer</span>
                <ArrowRight className="w-4 h-4" />
              </PrimaryButton>
            </Link>
          </div>
        </div>

        {/* Card 2: LinkedIn Analyzer */}
        <div className="interactive-card rounded-2xl bg-[#141419] border border-[#303038] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF7417]/5 rounded-bl-full pointer-events-none group-hover:bg-[#FF7417]/10 transition-colors" />

          <div>
            <div className="w-12 h-12 rounded-xl bg-[#FF7417]/15 border border-[#FF7417]/30 flex items-center justify-center text-[#FF7417] mb-5">
              <Linkedin className="w-6 h-6" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-[#F7F7FA]">LinkedIn Analyzer</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FF7417]/20 text-[#FF9B45] uppercase font-mono">
                Profile Audit
              </span>
            </div>

            <p className="text-sm text-[#A1A1AA] leading-relaxed mb-6">
              Analyze your LinkedIn profile via URL, official "Save to PDF" export, or pasted text.
              Uncover recruiter search visibility gaps, headline hooks, and career positioning advice.
            </p>

            <ul className="space-y-2.5 text-xs text-[#A1A1AA] mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF7417]" />
                <span>Recruiter search discoverability & keyword indexing</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF7417]" />
                <span>Headline rewrite variations for target industries</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF7417]" />
                <span>About / Summary narrative storytelling analysis</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF7417]" />
                <span>URL mode, PDF export mode, and text fallback</span>
              </li>
            </ul>
          </div>

          <div>
            <Link to="/linkedin" className="block">
              <PrimaryButton variant="orange" className="w-full justify-between">
                <span>Open LinkedIn Analyzer</span>
                <ArrowRight className="w-4 h-4" />
              </PrimaryButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Live System Connectivity & Telemetry */}
      <section className="rounded-2xl bg-[#141419] border border-[#303038] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#303038] flex items-center justify-between flex-wrap gap-4 bg-[#1C1C23]/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0B0B0E] border border-[#303038] rounded-xl text-[#FF7417]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F7F7FA]">
                Backend System Health & Telemetry
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Live telemetry directly from <code className="text-[#FF7417] font-mono">GET /api/health</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#1C1C23] text-[#F7F7FA] border border-[#303038] hover:border-[#FF7417] transition-colors"
              title="Test Connection"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status === 'checking' ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <div className="flex items-center gap-3">
                {status === 'connected' ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                ) : status === 'offline' ? (
                  <div className="p-2.5 rounded-xl bg-[#C91432]/10 border border-[#C91432]/30 text-[#F04452]">
                    <XCircle className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <RefreshCw className="w-7 h-7 animate-spin" />
                  </div>
                )}

                <div>
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A1A1AA]">
                    Current Status
                  </span>
                  <h3 className="text-2xl font-extrabold text-[#F7F7FA]">
                    {status === 'connected'
                      ? 'Backend Connected'
                      : status === 'offline'
                      ? 'Backend Offline'
                      : 'Checking Connection...'}
                  </h3>
                </div>
              </div>

              <p className="mt-3 text-xs text-[#A1A1AA] leading-relaxed">
                {status === 'connected'
                  ? 'FastAPI server is operational, database connection pool initialized, and ready to accept BYOK requests.'
                  : status === 'offline'
                  ? 'Cannot reach the backend at /api/health. Ensure backend is running.'
                  : 'Probing the backend API endpoint...'}
              </p>

              {lastChecked && (
                <p className="mt-2 text-[11px] text-[#A1A1AA]/70 font-mono">
                  Last verified: {lastChecked.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Response Telemetry Inspector */}
            <div className="bg-[#0B0B0E] rounded-xl p-4 text-xs font-mono border border-[#303038] overflow-x-auto shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-[#303038] text-[#A1A1AA] text-[11px]">
                <span>RESPONSE PAYLOAD</span>
                <span className={status === 'connected' ? 'text-emerald-400' : 'text-[#F04452]'}>
                  {status === 'connected' ? '200 OK' : 'ERR / OFFLINE'}
                </span>
              </div>
              <pre className="mt-3 text-[#FF9B45] leading-relaxed">
                {JSON.stringify(
                  data || (error ? { error, status: 'offline' } : { status: 'probing...' }),
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-[#141419] border border-[#303038] hover:border-[#C91432]/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-[#C91432]/15 text-[#F04452] flex items-center justify-center mb-4">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-[#F7F7FA] text-base mb-2">
            ATS Heuristics & Scoring
          </h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Evaluates parsing vulnerabilities, multi-column layout risks, header readability, and role-specific keyword density.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141419] border border-[#303038] hover:border-[#FF7417]/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-[#FF7417]/15 text-[#FF7417] flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-[#F7F7FA] text-base mb-2">
            Zero-Storage BYOK Privacy
          </h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Your personal Google Gemini API key and uploaded documents are handled in memory and never stored in backend database tables.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141419] border border-[#303038] hover:border-[#F04452]/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-[#1C1C23] text-[#F7F7FA] flex items-center justify-center mb-4 border border-[#303038]">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-[#F7F7FA] text-base mb-2">
            Multi-Model Support
          </h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Choose between Gemini 2.5 Flash for high-speed analyses or Gemini 1.5 Pro for deep technical critiques.
          </p>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
