import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailModal } from '@/components/ui/EmailModal';
import { exportService, triggerBlobDownload } from '@/services/exportService';

vi.mock('@/services/exportService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/exportService')>();
  return {
    ...actual,
    exportService: {
      downloadResumeVersionPdf: vi.fn(),
      downloadResumeVersionDocx: vi.fn(),
      downloadUnsavedResumePdf: vi.fn(),
      downloadUnsavedResumeDocx: vi.fn(),
      downloadAnalysisReportPdf: vi.fn(),
      downloadJobMatchReportPdf: vi.fn(),
      getEmailStatus: vi.fn(),
      sendDocumentEmail: vi.fn(),
    },
  };
});

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('EmailModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders document information and checks email server status on mount', async () => {
    vi.mocked(exportService.getEmailStatus).mockResolvedValueOnce({
      is_configured: true,
      provider: 'smtp',
      from_address: 'noreply@resumereviewer.pro',
    });

    render(
      <EmailModal
        isOpen={true}
        onClose={vi.fn()}
        documentType="resume_pdf"
        documentId="res-123"
        documentTitle="Principal AI Engineer Resume"
        versionId="ver-1"
      />
    );

    expect(screen.getByText(/Email Document Attachment/i)).toBeInTheDocument();
    expect(screen.getByText('Principal AI Engineer Resume')).toBeInTheDocument();
    expect(screen.getByText(/Resume \(PDF Document\)/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Provider active:/i)).toBeInTheDocument();
      expect(screen.getByText(/SMTP/i)).toBeInTheDocument();
    });
  });

  it('displays warning when email provider is unconfigured on the server', async () => {
    vi.mocked(exportService.getEmailStatus).mockResolvedValueOnce({
      is_configured: false,
      provider: 'none',
      from_address: null,
    });

    render(
      <EmailModal
        isOpen={true}
        onClose={vi.fn()}
        documentType="analysis_pdf"
        documentId="analysis-456"
        documentTitle="Executive AI Analysis"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Email Provider Unconfigured/i)).toBeInTheDocument();
    });

    // Inputs and submit button should be disabled
    const sendButton = screen.getByRole('button', { name: /Send Document/i });
    expect(sendButton).toBeDisabled();
  });

  it('validates recipient email address before submission', async () => {
    vi.mocked(exportService.getEmailStatus).mockResolvedValueOnce({
      is_configured: true,
      provider: 'resend',
      from_address: 'delivery@resumereviewer.pro',
    });

    render(
      <EmailModal
        isOpen={true}
        onClose={vi.fn()}
        documentType="resume_docx"
        documentId="res-789"
        documentTitle="Staff Cloud Engineer Resume"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Provider active:/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(/recruiter@company.com/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    const form = emailInput.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid recipient email address/i)).toBeInTheDocument();
    });

    expect(exportService.sendDocumentEmail).not.toHaveBeenCalled();
  });

  it('submits email request and displays success confirmation', async () => {
    vi.mocked(exportService.getEmailStatus).mockResolvedValueOnce({
      is_configured: true,
      provider: 'sendgrid',
      from_address: 'support@resumereviewer.pro',
    });

    vi.mocked(exportService.sendDocumentEmail).mockResolvedValueOnce({
      success: true,
      log_id: 'log-999',
      recipient_email: 'hiring@techcorp.com',
      status: 'accepted',
      provider: 'sendgrid',
      message: "Document 'resume.pdf' successfully accepted for delivery.",
    });

    render(
      <EmailModal
        isOpen={true}
        onClose={vi.fn()}
        documentType="resume_pdf"
        documentId="res-123"
        documentTitle="Lead Platform Engineer"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Provider active:/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(/recruiter@company.com/i);
    fireEvent.change(emailInput, { target: { value: 'hiring@techcorp.com' } });

    const subjectInput = screen.getByPlaceholderText(/Application \/ Resume:/i);
    fireEvent.change(subjectInput, { target: { value: 'Application: Lead Platform Engineer' } });

    const form = emailInput.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(exportService.sendDocumentEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_email: 'hiring@techcorp.com',
          document_type: 'resume_pdf',
          document_id: 'res-123',
          subject: 'Application: Lead Platform Engineer',
        })
      );
      expect(screen.getByText(/Email Dispatched Successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/successfully accepted for delivery/i)).toBeInTheDocument();
    });
  });

  it('handles duplicate send cooldown error (HTTP 429)', async () => {
    vi.mocked(exportService.getEmailStatus).mockResolvedValueOnce({
      is_configured: true,
      provider: 'smtp',
    });

    vi.mocked(exportService.sendDocumentEmail).mockRejectedValueOnce({
      response: {
        status: 429,
        data: {
          detail: {
            error: 'DUPLICATE_SEND_BLOCKED',
            message: 'A document was already sent to this recipient within the last 30 seconds.',
          },
        },
      },
    });

    render(
      <EmailModal
        isOpen={true}
        onClose={vi.fn()}
        documentType="job_match_pdf"
        documentId="job-match-555"
        documentTitle="Job Fit Evaluation"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Provider active:/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(/recruiter@company.com/i);
    fireEvent.change(emailInput, { target: { value: 'manager@company.com' } });

    const form = emailInput.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText(/within the last 30 seconds/i)).toBeInTheDocument();
    });
  });
});

describe('Export Blob Download Functionality', () => {
  it('creates object URL and simulates anchor click for download', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/mock-blob-uuid');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    const sampleBlob = new Blob(['mock-pdf-content'], { type: 'application/pdf' });
    triggerBlobDownload(sampleBlob, 'jane-doe-resume.pdf');

    expect(createObjectURLMock).toHaveBeenCalledWith(sampleBlob);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/mock-blob-uuid');

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
