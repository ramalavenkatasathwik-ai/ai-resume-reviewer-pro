import React, { useRef, useState } from 'react';
import { UploadCloud, FileCheck, X, RefreshCw, AlertCircle } from 'lucide-react';

export interface FileDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onFileRemove?: () => void;
  disabled?: boolean;
  title?: string;
  subtitle?: string;
  maxSizeMB?: number;
  accept?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  file,
  onFileSelect,
  onFileRemove,
  disabled = false,
  title = 'Upload Resume PDF',
  subtitle = 'Drag and drop your resume file here or browse',
  maxSizeMB = 10,
  accept = '.pdf,application/pdf',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (f: File) => {
    setError(null);
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF documents (.pdf) are supported.');
      return;
    }
    if (f.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds maximum allowed limit of ${maxSizeMB} MB.`);
      return;
    }
    onFileSelect(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (onFileRemove) {
      onFileRemove();
    } else {
      onFileSelect(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`w-full space-y-2 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />

      <div
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
          file
            ? 'border-emerald-500/40 bg-[#1C1C23]'
            : isDragging
            ? 'border-[#FF7417] bg-[#FF7417]/10'
            : 'border-[#303038] bg-[#0B0B0E] hover:border-[#FF7417]/60 cursor-pointer'
        }`}
      >
        {file ? (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <FileCheck className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-[#F7F7FA] break-all">{file.name}</p>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                {(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Document
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0B0E] hover:bg-rose-950/40 border border-[#303038] text-xs font-semibold text-rose-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) fileInputRef.current?.click();
                }}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0B0E] hover:bg-[#24242E] border border-[#303038] text-xs font-semibold text-[#F7F7FA] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#FF7417]" /> Replace
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#1C1C23] text-[#FF7417] border border-[#303038] flex items-center justify-center mx-auto">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-[#F7F7FA]">{title}</h4>
              <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm mx-auto">{subtitle}</p>
            </div>

            <div className="inline-block px-4 py-2 rounded-xl bg-[#1C1C23] hover:bg-[#24242E] border border-[#303038] text-xs font-bold text-[#FF7417] transition-colors">
              Browse Document
            </div>

            <p className="text-[11px] text-[#A1A1AA]">
              Standard PDF formats only • Maximum {maxSizeMB} MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-[#F04452] font-semibold mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
