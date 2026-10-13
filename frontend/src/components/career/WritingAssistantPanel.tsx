import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  Edit2,
  Copy,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
} from 'lucide-react';
import {
  WritingSection,
  WritingSuggestionItem,
  WritingSuggestionResponse,
} from '@/types/careerIntelligence';
import { careerIntelligenceService } from '@/services/careerIntelligenceService';

interface WritingAssistantPanelProps {
  initialResumeId?: string;
  initialRole?: string;
  geminiApiKey?: string;
  onApplyText?: (section: WritingSection, text: string) => void;
}

const SECTION_OPTIONS: Array<{ value: WritingSection; label: string }> = [
  { value: 'summary', label: '1. Professional Summary' },
  { value: 'experience_bullets', label: '2. Experience Bullets' },
  { value: 'project_descriptions', label: '3. Project Descriptions' },
  { value: 'technical_skills', label: '4. Technical Skills Presentation' },
  { value: 'linkedin_headline', label: '5. LinkedIn Headline' },
  { value: 'linkedin_about', label: '6. LinkedIn About Section' },
  { value: 'cover_letter', label: '7. Cover Letter Draft' },
  { value: 'achievements', label: '8. Professional Achievements' },
];

export const WritingAssistantPanel: React.FC<WritingAssistantPanelProps> = ({
  initialResumeId,
  initialRole = 'AI Developer',
  geminiApiKey = '',
  onApplyText,
}) => {
  const [section, setSection] = useState<WritingSection>('summary');
  const [targetRole, setTargetRole] = useState<string>(initialRole);
  const [currentText, setCurrentText] = useState<string>('');
  const [instruction, setInstruction] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WritingSuggestionResponse | null>(null);

  // Per-suggestion interactive state
  const [statusMap, setStatusMap] = useState<Record<string, 'pending' | 'accepted' | 'rejected'>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [acceptedRevisions, setAcceptedRevisions] = useState<WritingSuggestionItem[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await careerIntelligenceService.getWritingSuggestions(
        {
          section,
          target_role: targetRole,
          current_text: currentText.trim() || undefined,
          resume_id: initialResumeId,
          instruction: instruction.trim() || undefined,
        },
        geminiApiKey
      );
      setResult(data);
      setStatusMap({});
      setEditingId(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: { message?: string } } } };
      setError(e.response?.data?.detail?.message || 'Failed to generate writing suggestions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAccept = (item: WritingSuggestionItem) => {
    const finalItem = editingId === item.id ? { ...item, proposed_revision: editText } : item;
    setStatusMap((prev) => ({ ...prev, [item.id]: 'accepted' }));
    setAcceptedRevisions((prev) => [...prev.filter((i) => i.id !== item.id), finalItem]);
    setEditingId(null);
    if (onApplyText) {
      onApplyText(section, finalItem.proposed_revision);
    }
  };

  const handleReject = (id: string) => {
    setStatusMap((prev) => ({ ...prev, [id]: 'rejected' }));
    setAcceptedRevisions((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (item: WritingSuggestionItem) => {
    setEditingId(item.id);
    setEditText(item.proposed_revision);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Card */}
      <div className="p-6 rounded-2xl bg-[#141419] border border-white/5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FF7417]" />
              AI Career Writing Assistant
            </h2>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Select any of the 8 career sections to generate high-impact, quantified, role-aligned revisions.
            </p>
          </div>
          {acceptedRevisions.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4" />
              {acceptedRevisions.length} Accepted
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
              Career Section
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as WritingSection)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1B22] border border-white/10 text-white text-sm focus:outline-none focus:border-[#C91432]"
            >
              {SECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#141419]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
              Target Role Alignment
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. AI Developer, Python Engineer"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1B22] border border-white/10 text-white text-sm focus:outline-none focus:border-[#C91432]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
            Current / Draft Text (Optional if linking to saved resume)
          </label>
          <textarea
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            rows={3}
            placeholder="Paste your existing sentence, bullet point, or draft section here..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1B22] border border-white/10 text-white text-sm focus:outline-none focus:border-[#C91432] resize-y placeholder:text-zinc-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
            Custom Framing Instruction (Optional)
          </label>
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. Focus on quantifiable latency gains, emphasize cloud architecture"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1B22] border border-white/10 text-white text-sm focus:outline-none focus:border-[#C91432]"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#C91432] to-[#FF7417] text-white hover:opacity-90 transition shadow-lg shadow-[#C91432]/20 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                Crafting Suggestions...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate 3 Revisions
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#1B1B22] border border-white/5 flex items-center justify-between">
            <span className="text-xs text-[#A1A1AA]">
              {result.editorial_notes || `Review revisions for ${result.section} targeting ${result.target_role}.`}
            </span>
            <span className="text-xs font-semibold text-[#FF7417]">
              {result.suggestions.length} Options Generated
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {result.suggestions.map((item, idx) => {
              const status = statusMap[item.id] || 'pending';
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border transition-all duration-200 ${
                    status === 'accepted'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : status === 'rejected'
                      ? 'bg-zinc-900/30 border-white/5 opacity-60'
                      : 'bg-[#141419] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#1B1B22] text-[#FF9B45] border border-white/5">
                        Option {String.fromCharCode(65 + idx)}
                      </span>
                      {item.metric_focus && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {item.metric_focus}
                        </span>
                      )}
                      {status === 'accepted' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400">
                          Accepted
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, isEditing ? editText : item.proposed_revision)}
                        className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-white/5 transition"
                        title="Copy to clipboard"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {status !== 'accepted' && (
                        <>
                          <button
                            type="button"
                            onClick={() => (isEditing ? setEditingId(null) : startEdit(item))}
                            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-white/5 transition"
                            title="Edit before accepting"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(item.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                            title="Reject suggestion"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAccept(item)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Accept
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Proposed Text */}
                  {isEditing ? (
                    <div className="space-y-2 mb-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full p-3 rounded-xl bg-[#1B1B22] border border-[#FF7417]/50 text-white text-sm focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs text-[#A1A1AA] hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAccept(item)}
                          className="px-3 py-1 text-xs font-semibold bg-emerald-500 text-white rounded-lg"
                        >
                          Save & Accept
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-white font-medium leading-relaxed mb-3">
                      {item.proposed_revision}
                    </p>
                  )}

                  {/* Explanation */}
                  <p className="text-xs text-[#A1A1AA] mb-3">
                    <span className="font-semibold text-zinc-300">Why this works:</span>{' '}
                    {item.explanation}
                  </p>

                  {/* Action Verbs */}
                  {item.action_verbs_used && item.action_verbs_used.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="text-[11px] text-zinc-500">Action verbs:</span>
                      {item.action_verbs_used.map((verb) => (
                        <span
                          key={verb}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-zinc-300 border border-white/5"
                        >
                          {verb}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Confirmation Guardrail Banner */}
                  {item.requires_user_confirmation && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-amber-300 text-xs">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Verification Needed: </span>
                        {item.verification_prompt ||
                          'Please verify specific numerical metrics or unevidenced tools before finalizing.'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
