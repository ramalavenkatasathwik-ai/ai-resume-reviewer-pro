import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ResumesPage } from '@/pages/ResumesPage';
import { resumeDocumentService } from '@/services/resumeDocumentService';

vi.mock('@/services/resumeDocumentService', () => ({
  resumeDocumentService: {
    listResumes: vi.fn(),
    createResume: vi.fn(),
    updateResume: vi.fn(),
    duplicateResume: vi.fn(),
    deleteResume: vi.fn(),
    listVersions: vi.fn(),
    restoreVersion: vi.fn(),
  },
}));

describe('ResumesPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders My Resumes header and empty state when library is empty', async () => {
    vi.mocked(resumeDocumentService.listResumes).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <ResumesPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/My Resumes/i);
    await waitFor(() => {
      expect(screen.getByText(/No Resumes Found/i)).toBeInTheDocument();
    });
  });

  it('renders resume document cards with title, role, and version badge', async () => {
    vi.mocked(resumeDocumentService.listResumes).mockResolvedValueOnce([
      {
        id: 'res-1',
        user_id: 'user-1',
        title: 'Lead Software Architect',
        target_role: 'AI Solutions Architect',
        current_version_id: 'v-1',
        is_archived: false,
        versions_count: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    render(
      <MemoryRouter>
        <ResumesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Lead Software Architect')).toBeInTheDocument();
      expect(screen.getByText('AI Solutions Architect')).toBeInTheDocument();
      expect(screen.getByText(/v3 Snapshot/i)).toBeInTheDocument();
    });
  });

  it('opens Create Resume modal and submits new document', async () => {
    vi.mocked(resumeDocumentService.listResumes).mockResolvedValueOnce([]);
    vi.mocked(resumeDocumentService.createResume).mockResolvedValueOnce({
      id: 'res-new',
      user_id: 'user-1',
      title: 'MLOps Lead',
      target_role: 'MLOps Engineer',
      is_archived: false,
      versions_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <ResumesPage />
      </MemoryRouter>
    );

    const createBtn = screen.getByRole('button', { name: /Create New Resume/i });
    fireEvent.click(createBtn);

    expect(screen.getByRole('heading', { name: /Create New Resume Document/i })).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/e\.g\. Senior Machine Learning Engineer/i);
    fireEvent.change(titleInput, { target: { value: 'MLOps Lead' } });

    const submitBtn = screen.getByRole('button', { name: /Create & Open Editor/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(resumeDocumentService.createResume).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'MLOps Lead',
        })
      );
    });
  });
});
