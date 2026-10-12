import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ModelSelectorProps {
  value?: string;
  selectedModel?: string;
  onChange: (model: string) => void;
  models?: string[];
  disabled?: boolean;
  label?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  selectedModel,
  onChange,
  models: externalModels,
  disabled = false,
  label = 'Target Gemini Model',
}) => {
  const [internalModels, setInternalModels] = useState<string[]>([
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ]);

  const activeValue = selectedModel !== undefined ? selectedModel : (value || 'gemini-2.5-flash');
  const availableModels = externalModels && externalModels.length > 0 ? externalModels : internalModels;

  const activeValueRef = useRef(activeValue);
  activeValueRef.current = activeValue;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!externalModels || externalModels.length === 0) {
      axios
        .get<{ models: Array<{ id: string }>; default_model: string }>(`${API_BASE_URL}/api/models`)
        .then((res) => {
          if (res.data?.models && res.data.models.length > 0) {
            const ids = res.data.models.map((m) => m.id);
            setInternalModels(ids);
            if (!activeValueRef.current && res.data.default_model) {
              onChangeRef.current(res.data.default_model);
            }
          }
        })
        .catch(() => {
          // Safe fallback list
        });
    }
  }, [externalModels]);

  return (
    <div className={`w-full space-y-1.5 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <label className="block text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
        {label}
      </label>
      <select
        value={activeValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0E] border border-[#303038] text-xs text-[#F7F7FA] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7417]"
      >
        {availableModels.map((m) => (
          <option key={m} value={m}>
            {m} {m === 'gemini-2.5-flash' ? '(Recommended - Flagship GA)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ModelSelector;
