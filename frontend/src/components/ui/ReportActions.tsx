import React, { useState } from 'react';
import { Printer, Mail, RotateCcw, Copy, Info } from 'lucide-react';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export interface ReportActionsProps {
  onPrint?: () => void;
  onCopySummary?: () => void;
  onReset: () => void;
  reportTitle?: string;
}

export const ReportActions: React.FC<ReportActionsProps> = ({
  onPrint = () => window.print(),
  onCopySummary,
  onReset,
}) => {
  const [showEmailNotice, setShowEmailNotice] = useState(false);

  return (
    <div className="bg-[#141419] rounded-2xl border border-[#303038] p-5 sm:p-6 space-y-4 no-print">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-[#F7F7FA]">Report Export & Actions</h4>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Download your comprehensive evaluation or start a new analysis session.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <PrimaryButton
            onClick={onPrint}
            icon={<Printer className="w-4 h-4" />}
            size="sm"
          >
            Download / Print PDF Report
          </PrimaryButton>

          {onCopySummary && (
            <SecondaryButton
              onClick={onCopySummary}
              icon={<Copy className="w-3.5 h-3.5" />}
              size="sm"
            >
              Copy Summary
            </SecondaryButton>
          )}

          <button
            type="button"
            onClick={() => setShowEmailNotice(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1C1C23] hover:bg-[#24242E] border border-[#303038] text-xs font-semibold text-[#A1A1AA] hover:text-[#F7F7FA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7417]"
            title="Email delivery activates in Phase 3"
          >
            <Mail className="w-3.5 h-3.5 text-[#FF7417]" />
            Send to Email
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#0B0B0E] text-[#FF7417] border border-[#303038]">
              Phase 3
            </span>
          </button>

          <SecondaryButton
            onClick={onReset}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            size="sm"
          >
            New Analysis
          </SecondaryButton>
        </div>
      </div>

      {showEmailNotice && (
        <div className="p-3.5 rounded-xl bg-[#0B0B0E] border border-[#303038] text-xs text-[#A1A1AA] flex items-start justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-[#FF7417] mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-[#F7F7FA]">Email Delivery Infrastructure Notice</p>
              <p className="text-[11px] mt-0.5 text-[#A1A1AA]">
                Direct automated email report dispatch is scheduled for Phase 3 implementation via secure SMTP/SendGrid.
                Please use the <strong>Download / Print PDF Report</strong> action to save or print your report immediately.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowEmailNotice(false)}
            className="text-[11px] font-semibold text-[#FF7417] hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportActions;
