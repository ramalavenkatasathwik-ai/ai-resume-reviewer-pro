import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck,
  Zap,
  ArrowRight,
  Server,
  KeyRound,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ConnectionStatus, HealthResponse } from '@/types/api';

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
  return (
    <div className="space-y-16 py-10 sm:py-16">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto px-4 sm:px-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          Production Foundation Initialized
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
          AI Resume Reviewer <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Pro</span>
        </h1>

        <p className="mt-5 text-xl sm:text-2xl text-slate-600 font-medium max-w-2xl mx-auto">
          AI-powered Resume, ATS and Career Analysis
        </p>

        <p className="mt-4 text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
          Built on a modern microservice-ready stack with React, TypeScript, FastAPI, PostgreSQL, and Docker.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all focus:ring-4 focus:ring-indigo-200"
          >
            Launch Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-700 font-semibold text-sm border border-slate-300 shadow-sm hover:bg-slate-50 hover:border-slate-400 transition-all focus:ring-4 focus:ring-slate-100"
          >
            Configure Settings
          </Link>
        </div>
      </section>

      {/* Live System Connectivity Panel */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  System Health & Connectivity
                </h2>
                <p className="text-xs text-slate-500">
                  Direct live communication with <code className="text-indigo-600 font-mono">GET /api/health</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Retry Health Check"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${status === 'checking' ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <div className="flex items-center gap-3">
                  {status === 'connected' ? (
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : status === 'offline' ? (
                    <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                      <XCircle className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 animate-pulse">
                      <RefreshCw className="w-7 h-7 animate-spin" />
                    </div>
                  )}

                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                      Current State
                    </span>
                    <h3 className="text-2xl font-extrabold text-slate-900">
                      {status === 'connected'
                        ? 'Backend Connected'
                        : status === 'offline'
                        ? 'Backend Offline'
                        : 'Checking Backend...'}
                    </h3>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  {status === 'connected'
                    ? 'The FastAPI backend is reachable, responding to health requests, and operating smoothly.'
                    : status === 'offline'
                    ? 'Unable to reach the FastAPI server at /api/health. Ensure backend is running.'
                    : 'Pinging the backend API endpoint...'}
                </p>

                {lastChecked && (
                  <p className="mt-2 text-[11px] text-slate-400 font-mono">
                    Last probed: {lastChecked.toLocaleTimeString()}
                  </p>
                )}
              </div>

              {/* API Response Telemetry */}
              <div className="bg-slate-900 rounded-xl p-4 text-xs font-mono text-slate-200 overflow-x-auto shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
                  <span>RESPONSE PAYLOAD</span>
                  <span className="text-emerald-400">200 OK</span>
                </div>
                <pre className="mt-3 leading-relaxed text-indigo-300">
                  {JSON.stringify(
                    data || (error ? { error, status: 'offline' } : { status: 'probing...' }),
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">
              ATS Scoring & Parser Insights
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Designed to benchmark resumes against strict Applicant Tracking System parser heuristics and keyword extraction rules.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">
              BYOK Privacy Architecture
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Bring Your Own Key architecture ensures that user Gemini API keys stay private and are never stored or hardcoded on servers.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">
              Production Scalability
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Built with Docker containers, SQLAlchemy connection pooling, Alembic migrations, and automated CI pipelines.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
