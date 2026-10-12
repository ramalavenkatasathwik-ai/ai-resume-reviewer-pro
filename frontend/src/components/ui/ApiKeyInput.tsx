import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink, X } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedModel?: string;
  label?: string;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  value,
  onChange,
  selectedModel = 'gemini-2.5-flash',
  label = 'Gemini API Key (BYOK)',
}) => {
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid?: boolean;
    message?: string;
  } | null>(null);

  const handleValidate = async () => {
    if (!value.trim()) return;
    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await axios.post<{ valid: boolean; message: string }>(
        `${API_BASE_URL}/api/keys/validate`,
        { model: selectedModel },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Gemini-API-Key': value.trim(),
          },
        }
      );
      setValidationResult({
        valid: response.data.valid,
        message: response.data.message || 'Key successfully validated.',
      });
    } catch (err: unknown) {
      let msg = 'Key validation failed. Please check that the key is active.';
      if (axios.isAxiosError(err)) {
        msg =
          err.response?.data?.detail?.message ||
          err.response?.data?.message ||
          err.message ||
          msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setValidationResult({ valid: false, message: msg });
    } finally {
      setIsValidating(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setValidationResult(null);
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
          {label}
        </label>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-semibold text-[#FF7417] hover:underline flex items-center gap-1"
        >
          Get free key <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A1A1AA]">
          <KeyRound className="w-4 h-4" />
        </div>

        <input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (validationResult) setValidationResult(null);
          }}
          placeholder="Paste your Google Gemini API key (AIzaSy...)"
          className="w-full pl-10 pr-28 py-2.5 rounded-xl bg-[#0B0B0E] border border-[#303038] text-xs text-[#F7F7FA] font-mono placeholder-[#71717A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7417]"
        />

        <div className="absolute inset-y-1.5 right-1.5 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear Key"
              className="p-1 rounded text-[#71717A] hover:text-[#F7F7FA] focus-visible:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="px-2 py-1 text-[11px] font-semibold text-[#A1A1AA] hover:text-white focus-visible:outline-none"
          >
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            disabled={!value.trim() || isValidating}
            onClick={handleValidate}
            className="px-2.5 py-1 rounded-lg bg-[#1C1C23] hover:bg-[#24242E] border border-[#303038] text-[10px] font-bold text-[#F7F7FA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isValidating ? 'Testing...' : 'Test'}
          </button>
        </div>
      </div>

      {validationResult && (
        <div
          className={`flex items-center gap-1.5 text-[11px] font-semibold ${
            validationResult.valid ? 'text-emerald-400' : 'text-[#F04452]'
          }`}
        >
          {validationResult.valid ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{validationResult.message}</span>
        </div>
      )}

      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
        Zero-Storage BYOK: Keys exist purely in memory for this session and are never saved to database or disk.
      </p>
    </div>
  );
};

export default ApiKeyInput;
