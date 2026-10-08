import React from 'react';
import { UploadCloud, History, FileText, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-8 py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Resume Analysis Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Phase 1 Foundation — Analysis engine and resume upload pipelines activate in Phase 2.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            BYOK Configuration
          </Link>
        </div>
      </div>

      {/* Metrics Row Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Reviews</span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">0</p>
          <p className="text-[11px] text-slate-400 mt-1">Ready for first submission</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg ATS Score</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">—</p>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting analysis pipeline</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Configured Engine</span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono">BYOK</span>
          </div>
          <p className="text-xl font-bold text-slate-800 mt-2 truncate">Gemini 3.8 Flash</p>
          <p className="text-[11px] text-slate-400 mt-1">Configurable via Settings</p>
        </div>
      </div>

      {/* Main Upload Placeholder Area */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center hover:border-indigo-300 transition-colors">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          Upload Resume (PDF, DOCX, TXT)
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
          File upload and parser processing will be integrated in Phase 2. The backend foundation and database schema are ready for job and analysis models.
        </p>
        <div className="mt-6">
          <button
            disabled
            className="cursor-not-allowed px-5 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold inline-flex items-center gap-2"
          >
            Upload Disabled in Phase 1
          </button>
        </div>
      </div>

      {/* Recent History Placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">Recent Analyses</h3>
          </div>
          <span className="text-xs text-slate-400">0 records</span>
        </div>
        <div className="py-8 text-center text-slate-400 text-xs">
          No analysis history yet. Complete Phase 1 verification to prepare for Phase 2 implementation.
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
