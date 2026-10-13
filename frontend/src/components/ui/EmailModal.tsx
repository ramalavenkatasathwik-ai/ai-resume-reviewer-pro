import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, AlertCircle, CheckCircle2, Loader2, Send, ShieldAlert, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { exportService } from '@/services/exportService';
import { DocumentEmailRequest, EmailConfigStatusResponse } from '@/types/export';
import { StructuredResumeData } from '@/types/resume';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'resume_pdf' | 'resume_docx' | 'analysis_pdf' | 'job_match_pdf';
  documentId: string;
  documentTitle: string;
  versionId?: string | null;
  unsavedResumeData?: StructuredResumeData | Record<string, unknown> | null;
  templateName?: string;
  pageFormat?: 'letter' | 'a4';
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  documentType,
  documentId,
  documentTitle,
  versionId,
  unsavedResumeData,
  templateName = 'modern',
  pageFormat = 'letter',
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailConfigStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Check email provider readiness when modal opens
  useEffect(() => {
    if (isOpen) {
      setSendSuccess(null);
      setSendError(null);
      setIsLoadingStatus(true);
      setStatusError(null);
      exportService
        .getEmailStatus()
        .then((res) => {
          setEmailStatus(res);
        })
        .catch(() => {
          setStatusError('Could not verify server email configuration.');
        })
        .finally(() => {
          setIsLoadingStatus(false);
        });
    }
  }, [isOpen]);

  const getDocTypeLabel = () => {
    switch (documentType) {
      case 'resume_pdf':
        return 'Resume (PDF Document)';
      case 'resume_docx':
        return 'Resume (Word DOCX Document)';
      case 'analysis_pdf':
        return 'Analysis Report (PDF Document)';
      case 'job_match_pdf':
        return 'Job Match Fit Report (PDF Document)';
      default:
        return 'Document';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setSendSuccess(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail.trim() || !emailRegex.test(recipientEmail.trim())) {
      setSendError('Please enter a valid recipient email address.');
      return;
    }

    setIsSubmitting(true);

    const payload: DocumentEmailRequest = {
      recipient_email: recipientEmail.trim(),
      document_type: documentType,
      document_id: documentId,
      version_id: versionId,
      unsaved_resume_data: unsavedResumeData,
      template_name: templateName,
      page_format: pageFormat,
      subject: subject.trim() || undefined,
      custom_message: customMessage.trim() || undefined,
    };

    try {
      const response = await exportService.sendDocumentEmail(payload);
      setSendSuccess(
        response.message || `Document accepted for delivery to ${response.recipient_email}.`
      );
    } catch (err: unknown) {
      let status = 0;
      let detail: { error?: string; message?: string } | undefined;
      let fallbackMessage = 'Failed to dispatch email. Please try again.';

      if (
        axios.isAxiosError(err) ||
        (err !== null && typeof err === 'object' && 'response' in err)
      ) {
        const axErr = err as {
          response?: { status?: number; data?: { detail?: { error?: string; message?: string } } };
          message?: string;
        };
        status = axErr.response?.status || 0;
        detail = axErr.response?.data?.detail;
        fallbackMessage = axErr.message || fallbackMessage;
      } else if (err instanceof Error) {
        fallbackMessage = err.message;
      }

      if (status === 503 || detail?.error === 'EMAIL_NOT_CONFIGURED') {
        setSendError(
          'Email delivery is currently not configured on this server. Please contact your system administrator.'
        );
      } else if (status === 429 || detail?.error === 'DUPLICATE_SEND_BLOCKED') {
        setSendError(
          detail?.message ||
            'A document was recently sent to this recipient. Please wait 30 seconds before retrying.'
        );
      } else if (status === 400 || detail?.error === 'VALIDATION_ERROR') {
        setSendError(detail?.message || 'Invalid recipient or email formatting error.');
      } else {
        setSendError(detail?.message || fallbackMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email Document Attachment" size="md">
      <div className="space-y-5">
        {/* Document Context Card */}
        <div className="p-3.5 rounded-xl bg-[#1B1B22] border border-[#303038] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[#FF7417] shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {getDocTypeLabel()}
            </div>
            <div className="text-sm font-medium text-white truncate mt-0.5">
              {documentTitle}
            </div>
            {unsavedResumeData && (
              <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Unsaved Draft Content
              </span>
            )}
          </div>
        </div>

        {/* Server Config Status Warning */}
        {isLoadingStatus ? (
          <div className="flex items-center gap-2 text-xs text-neutral-400 py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF7417]" />
            <span>Checking server email configuration...</span>
          </div>
        ) : emailStatus && !emailStatus.is_configured ? (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            <div className="text-xs leading-relaxed">
              <strong className="block font-semibold mb-0.5">Email Provider Unconfigured</strong>
              Email delivery is not enabled on this deployment. To send documents directly, configure
              SMTP or API keys in the backend environment.
            </div>
          </div>
        ) : statusError ? (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{statusError}</span>
          </div>
        ) : emailStatus?.is_configured ? (
          <div className="flex items-center gap-2 text-xs text-neutral-400 px-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>
              Provider active: <strong className="text-neutral-200 uppercase">{emailStatus.provider}</strong>
              {emailStatus.from_address && ` (${emailStatus.from_address})`}
            </span>
          </div>
        ) : null}

        {/* Success Alert */}
        {sendSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <strong className="block font-semibold mb-1">Email Dispatched Successfully</strong>
              <p className="text-xs text-emerald-200/90 leading-relaxed">{sendSuccess}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {sendError && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{sendError}</span>
          </div>
        )}

        {/* Form */}
        {!sendSuccess ? (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Recipient Email <span className="text-[#F04452]">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recruiter@company.com or candidate@example.com"
                  required
                  disabled={isSubmitting || (emailStatus !== null && !emailStatus.is_configured)}
                  className="w-full bg-[#1B1B22] border border-[#303038] focus:border-[#FF7417] focus:ring-1 focus:ring-[#FF7417] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition disabled:opacity-50"
                />
                <Mail className="absolute right-3.5 top-3 w-4 h-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Custom Subject <span className="text-neutral-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={`Application / Resume: ${documentTitle}`}
                disabled={isSubmitting || (emailStatus !== null && !emailStatus.is_configured)}
                className="w-full bg-[#1B1B22] border border-[#303038] focus:border-[#FF7417] focus:ring-1 focus:ring-[#FF7417] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Personal Message <span className="text-neutral-500 font-normal">(Optional note included in body)</span>
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Hello, please find attached my updated document..."
                rows={3}
                disabled={isSubmitting || (emailStatus !== null && !emailStatus.is_configured)}
                className="w-full bg-[#1B1B22] border border-[#303038] focus:border-[#FF7417] focus:ring-1 focus:ring-[#FF7417] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition resize-none disabled:opacity-50"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <SecondaryButton type="button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </SecondaryButton>
              <PrimaryButton
                type="submit"
                disabled={
                  isSubmitting ||
                  !recipientEmail.trim() ||
                  (emailStatus !== null && !emailStatus.is_configured)
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Attachment...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Document
                  </>
                )}
              </PrimaryButton>
            </div>
          </form>
        ) : (
          <div className="pt-2 flex justify-end">
            <PrimaryButton onClick={onClose}>Done</PrimaryButton>
          </div>
        )}
      </div>
    </Modal>
  );
};
