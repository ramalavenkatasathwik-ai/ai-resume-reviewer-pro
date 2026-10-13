import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ReportsPage } from '@/pages/ReportsPage';
import { analysisReportService } from '@/services/analysisReportService';

vi.mock('@/services/analysisReportService', () => ({
  analysisReportService: {
    listAnalyses: vi.fn(),
    getById: vi.fn(),
    deleteReport: vi.fn(),
  },
}));

describe('ReportsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders My Analysis Reports header and empty state when no items', async () => {
    vi.mocked(analysisReportService.listAnalyses).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 9,
      total_pages: 1,
    });

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/My Analysis Reports/i);
    await waitFor(() => {
      expect(screen.getByText(/No Analysis Reports Found/i)).toBeInTheDocument();
    });
  });

  it('renders analysis report cards with scores and metadata', async () => {
    vi.mocked(analysisReportService.listAnalyses).mockResolvedValueOnce({
      items: [
        {
          id: 'rep-1',
          original_filename: 'candidate_resume.pdf',
          source_type: 'pdf',
          analysis_type: 'resume',
          target_role: 'Senior AI Engineer',
          status: 'completed',
          overall_score: 88,
          ats_score: 92,
          model_name: 'gemini-2.5-flash',
          created_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      page_size: 9,
      total_pages: 1,
    });

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('candidate_resume.pdf')).toBeInTheDocument();
      expect(screen.getByText('Senior AI Engineer')).toBeInTheDocument();
      expect(screen.getByText('88')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
    });
  });

  it('opens report detail modal when clicking View Report', async () => {
    vi.mocked(analysisReportService.listAnalyses).mockResolvedValueOnce({
      items: [
        {
          id: 'rep-1',
          original_filename: 'test_resume.pdf',
          source_type: 'pdf',
          analysis_type: 'resume',
          target_role: 'Lead ML Engineer',
          status: 'completed',
          overall_score: 85,
          ats_score: 90,
          created_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      page_size: 9,
      total_pages: 1,
    });

    vi.mocked(analysisReportService.getById).mockResolvedValueOnce({
      id: 'rep-1',
      original_filename: 'test_resume.pdf',
      source_type: 'pdf',
      analysis_type: 'resume',
      target_role: 'Lead ML Engineer',
      status: 'completed',
      overall_score: 85,
      ats_score: 90,
      result_json: {
        professional_summary: 'Experienced ML engineer with deep learning background.',
        strengths: ['Strong Python & PyTorch experience'],
        weaknesses: ['Needs more cloud architecture proof'],
      },
    });

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('test_resume.pdf')).toBeInTheDocument();
    });

    const viewButton = screen.getByRole('button', { name: /View Report/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Experienced ML engineer with deep learning background/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Strong Python & PyTorch experience/i)).toBeInTheDocument();
    });
  });
});
