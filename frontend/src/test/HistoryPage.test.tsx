import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HistoryPage } from '@/pages/HistoryPage';
import { resumeService } from '@/services/resumeService';

vi.mock('@/services/resumeService', () => ({
  resumeService: {
    getHistory: vi.fn(),
  },
}));

describe('HistoryPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and metrics', async () => {
    vi.mocked(resumeService.getHistory).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Analysis History/i);
    expect(screen.getByText(/Total Runs/i)).toBeInTheDocument();
    expect(screen.getByText(/Average Score/i)).toBeInTheDocument();
  });

  it('displays empty state when no analysis history exists', async () => {
    vi.mocked(resumeService.getHistory).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No Analyses Recorded Yet/i)).toBeInTheDocument();
    });
  });

  it('renders records in a table when history exists', async () => {
    vi.mocked(resumeService.getHistory).mockResolvedValue([
      {
        id: 'hist-1',
        filename: 'resume_alex.pdf',
        target_role: 'Senior Backend Engineer',
        status: 'completed',
        analysis_type: 'resume',
        overall_score: 91,
        ats_score: 94,
        created_at: '2026-10-12T12:00:00Z',
      },
      {
        id: 'hist-2',
        filename: 'linkedin.com/in/alex-smith',
        target_role: 'Lead Cloud Architect',
        status: 'completed',
        analysis_type: 'linkedin',
        overall_score: 84,
        ats_score: 82,
        created_at: '2026-10-12T13:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Senior Backend Engineer')).toBeInTheDocument();
      expect(screen.getByText('Lead Cloud Architect')).toBeInTheDocument();
      expect(screen.getByText('91/100')).toBeInTheDocument();
      expect(screen.getByText('84/100')).toBeInTheDocument();
    });
  });
});
