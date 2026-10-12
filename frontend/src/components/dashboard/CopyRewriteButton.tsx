import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyRewriteButtonProps {
  textToCopy: string;
  label?: string;
  className?: string;
}

export const CopyRewriteButton: React.FC<CopyRewriteButtonProps> = ({
  textToCopy,
  label = 'Copy',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!textToCopy) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for environments where navigator.clipboard might be unavailable
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copied to clipboard' : `Copy ${label}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all button-press ${
        copied
          ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300'
          : 'bg-[#1C1C23] hover:bg-[#282834] border border-[#303038] text-slate-300 hover:text-white'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-[#FF7417]" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

export default CopyRewriteButton;
