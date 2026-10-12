import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer,
  Mail,
  Clock,
  Sparkles,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Toast } from '@/components/ui/Toast';

export const ReportsPage: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handlePrintSample = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#303038]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1C1C23] text-[#FF9B45] border border-[#303038] uppercase font-mono">
              Export Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F7F7FA] tracking-tight">
            Reports & Deliverables
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Export, print, and manage comprehensive candidate analysis reports and ATS audit documentation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SecondaryButton
            size="sm"
            onClick={handlePrintSample}
            className="border-[#303038]"
          >
            <Printer className="w-3.5 h-3.5 text-[#FF7417]" />
            <span>Browser Print</span>
          </SecondaryButton>
        </div>
      </div>

      {/* Available Export Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Method 1: In-Browser PDF Generation */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#141419] border border-[#303038] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#C91432]/15 border border-[#C91432]/30 flex items-center justify-center text-[#F04452]">
              <Printer className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-[#F7F7FA]">
                  Instant PDF & Print Export
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 font-mono">
                  LIVE NOW
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Generate clean, publication-ready PDF exports directly in your browser. All report pages include CSS print media queries that optimize margins, hide navigation bars, and retain crisp vector typography.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-[#A1A1AA] pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF7417]" />
                <span>Available on both Resume Analyzer and LinkedIn Analyzer</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF7417]" />
                <span>Preserves 0–100 scores, bullet improvements, and interview questions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF7417]" />
                <span>Zero telemetry or server-side document storage</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6 border-t border-[#303038] flex items-center gap-3">
            <Link to="/dashboard" className="flex-1">
              <PrimaryButton variant="crimson" size="sm" className="w-full justify-center">
                <FileText className="w-3.5 h-3.5" />
                <span>Analyze Resume First</span>
              </PrimaryButton>
            </Link>
          </div>
        </div>

        {/* Method 2: Phase 3 Automated Email Dispatch Notice */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#141419] border border-[#303038] flex flex-col justify-between relative overflow-hidden">
          {/* Subtle amber gradient corner */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none" />

          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Mail className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-[#F7F7FA]">
                  Automated Email Reports
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  PHASE 3 SCHEDULED
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Automated email delivery via SMTP and SendGrid is scheduled for Phase 3. In compliance with strict production readiness standards, we do not provide mock or simulated email delivery.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-2 text-xs text-[#A1A1AA]">
              <span className="font-semibold text-[#F7F7FA] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#FF7417]" />
                Upcoming Phase 3 Capabilities:
              </span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#A1A1AA]/90 pl-1">
                <li>Authenticated SMTP / transactional email delivery</li>
                <li>Secure PDF attachments generated via headless rendering</li>
                <li>Configurable candidate notification preferences</li>
                <li>Recruiter share links with password protection</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-[#303038]">
            <button
              type="button"
              onClick={() =>
                setToastMessage(
                  'Email delivery will be activated in Phase 3 after authentication and SMTP pipelines are configured.'
                )
              }
              className="w-full py-2.5 rounded-xl bg-[#1C1C23] border border-[#303038] text-xs font-semibold text-[#A1A1AA] hover:text-[#F7F7FA] hover:border-amber-500/40 transition-colors"
            >
              Check Phase 3 Status
            </button>
          </div>
        </div>
      </div>

      {/* Export Best Practices Guide */}
      <div className="p-6 rounded-2xl bg-[#141419] border border-[#303038] space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#F7F7FA]">
          <Sparkles className="w-4 h-4 text-[#FF7417]" />
          <span>Report Generation & Sharing Best Practices</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#A1A1AA]">
          <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1.5">
            <span className="font-bold text-[#F7F7FA] block">1. Target Specificity</span>
            <p className="text-[11px] leading-relaxed">
              Always select or enter an accurate job title to ensure ATS keyword density benchmarks reflect your exact industry.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1.5">
            <span className="font-bold text-[#F7F7FA] block">2. Browser PDF Settings</span>
            <p className="text-[11px] leading-relaxed">
              In your browser's Print dialog, choose 'Save as PDF' and select 'Background graphics' to retain dark theme visual fidelity.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0E] border border-[#303038] space-y-1.5">
            <span className="font-bold text-[#F7F7FA] block">3. Ephemeral Safety</span>
            <p className="text-[11px] leading-relaxed">
              Reports do not expose your Gemini API key. You can safely share exported PDFs with recruiters and mentors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
