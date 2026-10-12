import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Check,
  Server,
  Trash2,
  ExternalLink,
  Sliders,
} from 'lucide-react';
import { ApiKeyInput } from '@/components/ui/ApiKeyInput';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Toast } from '@/components/ui/Toast';
import { linkedinService } from '@/services/linkedinService';

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('gemini_api_key') || '';
    } catch {
      return '';
    }
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      return localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
    } catch {
      return 'gemini-2.5-flash';
    }
  });

  const [availableModels, setAvailableModels] = useState<string[]>([
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    linkedinService
      .getSupportedModels()
      .then((res) => {
        if (res.models && res.models.length > 0) {
          setAvailableModels(res.models);
          setSelectedModel((curr) => curr || res.default_model || res.models[0]);
        }
      })
      .catch(() => {
        // Fallback default models already set
      });
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      localStorage.setItem('gemini_model', selectedModel);
      setToastMessage('Preferences and BYOK settings saved locally!');
    } catch {
      setToastMessage('Failed to write settings to local storage.');
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('gemini_model');
      setApiKey('');
      setSelectedModel('gemini-2.5-flash');
      setToastMessage('Cleared all locally cached keys and preferences.');
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Page Header */}
      <div className="pb-6 border-b border-[#303038]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1C1C23] text-[#FF9B45] border border-[#303038] uppercase font-mono">
            Configuration Hub
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F7F7FA] tracking-tight">
          Application & BYOK Settings
        </h1>
        <p className="text-sm text-[#A1A1AA] mt-1">
          Configure client-side Google Gemini credentials, default model preferences, and view environment diagnostics.
        </p>
      </div>

      {/* BYOK Security Privacy Guarantee */}
      <div className="p-5 rounded-2xl bg-[#141419] border border-[#FF7417]/30 flex items-start gap-4">
        <div className="p-2 rounded-xl bg-[#FF7417]/15 text-[#FF7417] shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs text-[#A1A1AA] space-y-1">
          <p className="font-bold text-[#F7F7FA] text-sm">
            Zero-Storage BYOK (Bring Your Own Key) Security
          </p>
          <p className="leading-relaxed">
            Your Google Gemini API key is stored only in your personal browser's local storage and passed via request headers (<code className="text-[#FF7417] font-mono">X-Gemini-API-Key</code>). It is never saved into database tables or log files on our servers.
          </p>
        </div>
      </div>

      {/* Main Settings Form */}
      <form
        onSubmit={handleSave}
        className="p-6 sm:p-8 rounded-2xl bg-[#141419] border border-[#303038] space-y-6 shadow-xl"
      >
        <div className="flex items-center gap-2 text-base font-bold text-[#F7F7FA] pb-2 border-b border-[#303038]">
          <Sliders className="w-4 h-4 text-[#FF7417]" />
          <span>Gemini AI Engine Parameters</span>
        </div>

        {/* API Key Input with Live Validate Probe */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#F7F7FA] mb-2">
            Google Gemini API Key
          </label>
          <ApiKeyInput
            value={apiKey}
            onChange={setApiKey}
            selectedModel={selectedModel}
          />
        </div>

        {/* Model Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#F7F7FA] mb-2">
            Default Evaluation Model
          </label>
          <ModelSelector
            models={availableModels}
            selectedModel={selectedModel}
            onChange={setSelectedModel}
          />
          <p className="text-[11px] text-[#A1A1AA] mt-2">
            <span className="text-[#FF7417] font-semibold">gemini-2.5-flash</span> is recommended for low-latency ATS evaluation. <span className="text-[#FF7417] font-semibold">gemini-1.5-pro</span> provides extended reasoning depth.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-[#303038] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PrimaryButton variant="crimson" type="submit">
              <Check className="w-4 h-4" />
              <span>Save Preferences</span>
            </PrimaryButton>
            <SecondaryButton
              type="button"
              onClick={handleClear}
              className="text-[#F04452] hover:border-[#C91432]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Cached Key</span>
            </SecondaryButton>
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#FF7417] hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Get Free Gemini Key</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </form>

      {/* Backend Environment Diagnostics */}
      <div className="p-6 rounded-2xl bg-[#141419] border border-[#303038] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#303038] text-sm font-bold text-[#F7F7FA]">
          <Server className="w-4 h-4 text-[#FF7417]" />
          <span>System Environment Diagnostics</span>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038]">
            <dt className="text-[#A1A1AA] font-semibold">Frontend Origin</dt>
            <dd className="font-mono text-[#F7F7FA] mt-1 break-all">
              {window.location.origin}
            </dd>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038]">
            <dt className="text-[#A1A1AA] font-semibold">Backend Target Endpoint</dt>
            <dd className="font-mono text-[#F7F7FA] mt-1 break-all">
              {import.meta.env.VITE_API_URL || '(Proxy to backend via /api)'}
            </dd>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038]">
            <dt className="text-[#A1A1AA] font-semibold">Architecture</dt>
            <dd className="font-mono text-[#FF9B45] mt-1">
              FastAPI + React 18 + PostgreSQL + BYOK Gemini
            </dd>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038]">
            <dt className="text-[#A1A1AA] font-semibold">Release Version</dt>
            <dd className="font-mono text-emerald-400 mt-1">
              v2.1.0-production
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default SettingsPage;
