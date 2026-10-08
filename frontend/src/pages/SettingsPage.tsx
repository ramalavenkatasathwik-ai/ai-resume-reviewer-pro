import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Check, Server, Eye, EyeOff } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [savedNotification, setSavedNotification] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // BYOK: Key is only stored locally in user's browser, never sent to server until analysis request
    if (apiKey.trim()) {
      sessionStorage.setItem('byok_gemini_api_key', apiKey.trim());
    }
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  return (
    <div className="space-y-8 py-8 max-w-4xl mx-auto px-4 sm:px-6">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Application & BYOK Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure client-side parameters and review system connection details.
        </p>
      </div>

      {/* BYOK Security Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
        <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-bold">Zero-Storage BYOK (Bring Your Own Key) Security</p>
          <p>
            Your Google Gemini API key will never be hardcoded, logged, or saved into the repository or server databases. It operates purely as a client-provided credential during analysis sessions.
          </p>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Target Gemini Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="gemini-3.8-flash">Gemini 3.8 Flash (Recommended - Ultra Fast)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Client-Side Gemini API Key (BYOK)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your Gemini API key (active in Phase 2)"
              className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            API calls to Gemini are disabled during Phase 1 foundation verification.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Save Client Preferences
          </button>

          {savedNotification && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4" /> Preferences Stored Locally
            </span>
          )}
        </div>
      </form>

      {/* Backend Environment Diagnostics */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Server className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-800">Environment Details</h3>
        </div>
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="text-slate-400 font-medium">Frontend Base URL</dt>
            <dd className="font-mono text-slate-700 mt-1">{window.location.origin}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium">Configured Backend URL</dt>
            <dd className="font-mono text-slate-700 mt-1">
              {import.meta.env.VITE_API_URL || '(Proxy to :8000 via /api)'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default SettingsPage;
