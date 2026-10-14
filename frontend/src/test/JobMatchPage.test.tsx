import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { JobMatchPage } from '@/pages/JobMatchPage';
import { jobMatchService } from '@/services/jobMatchService';
import { resumeDocumentService } from '@/services/resumeDocumentService';

vi.mock('@/services/jobMatchService', () => ({
  jobMatchService: {
    extractRequirements: vi.fn(),
    analyzeJobMatch: vi.fn(),
    listJobMatches: vi.fn(),
    getJobMatch: vi.fn(),
    deleteJobMatch: vi.fn(),
    tailorResumeDraft: vi.fn(),
    saveTailoredResume: vi.fn(),
  },
}));

vi.mock('@/services/resumeDocumentService', () => ({
  resumeDocumentService: {
    listResumes: vi.fn(),
    listVersions: vi.fn(),
    getResume: vi.fn(),
  },
}));

const MOCK_RESUMES = [
  {
    id: 'res-123',
    user_id: 'user-1',
    title: 'Senior Full Stack AI Developer',
    target_role: 'AI Developer',
    current_version_id: 'v-101',
    is_archived: false,
    versions_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_VERSIONS = [
  {
    id: 'v-101',
    resume_id: 'res-123',
    version_number: 2,
    template_name: 'modern',
    page_format: 'letter',
    version_notes: 'Added LangChain projects',
    created_at: new Date().toISOString(),
  },
];

const MOCK_REPORT_DETAIL = {
  id: 'report-999',
  resume_id: 'res-123',
  resume_version_id: 'v-101',
  job_title: 'Lead AI Engineer',
  company_name: 'Anthropic Labs',
  job_description_raw: 'We are seeking a Lead AI Engineer with Python, FastAPI, and PyTorch.',
  extracted_requirements: {
    job_title: 'Lead AI Engineer',
    company_name: 'Anthropic Labs',
    required_technical_skills: ['Python', 'FastAPI', 'PyTorch'],
    preferred_technical_skills: ['Docker', 'Kubernetes'],
    education_qualifications: ["Bachelor's in Computer Science"],
    responsibilities: ['Architect scalable ML pipelines'],
    relevant_keywords: ['Python', 'PyTorch', 'FastAPI', 'Docker'],
  },
  comparison_result: {
    score_breakdown: {
      overall_score: 88,
      required_skills_score: 92,
      preferred_skills_score: 80,
      experience_score: 90,
      keyword_score: 85,
      total_requirements_count: 5,
      matched_count: 4,
      partial_count: 1,
      not_evidenced_count: 0,
      not_assessable_count: 0,
      matched_keywords: ['Python', 'FastAPI', 'Docker'],
      missing_keywords: ['PyTorch'],
    },
    items: [
      {
        requirement: 'Python & FastAPI',
        category: 'required_skill' as const,
        status: 'matched' as const,
        evidence: 'Built high-throughput backend services using FastAPI and Python.',
        gap_analysis: null,
        is_required: true,
      },
      {
        requirement: 'PyTorch deep learning',
        category: 'required_skill' as const,
        status: 'partial' as const,
        evidence: 'Fine-tuned Hugging Face transformer models.',
        gap_analysis: 'PyTorch not explicitly cited in experience bullets.',
        is_required: true,
      },
    ],
  },
  recommendations: [
    {
      id: 'rec-1',
      category: 'skill_alignment',
      target_section: 'Technical Skills',
      current_state: 'Skills list mentions general ML',
      recommended_action: 'Explicitly highlight PyTorch and transformer fine-tuning',
      reason: 'PyTorch is a core requirement mentioned repeatedly in the job description.',
      proposed_text: 'Deep Learning: PyTorch, TensorFlow, Hugging Face Transformers',
      requires_user_confirmation: false,
      priority: 'high' as const,
    },
    {
      id: 'rec-2',
      category: 'metric_impact',
      target_section: 'Experience',
      current_state: 'Optimized inference pipeline',
      recommended_action: 'Add quantified performance metrics to API latency',
      reason: 'Increases demonstrable business and engineering impact.',
      proposed_text: 'Reduced P99 API latency by 42% through async batching.',
      requires_user_confirmation: true,
      priority: 'high' as const,
    },
  ],
  overall_score: 88,
  required_skills_score: 92,
  keyword_score: 85,
  scoring_version: 'v1.0',
  model_name: 'gemini-2.5-flash',
  status: 'completed',
  retention_days: 90,
  created_at: new Date().toISOString(),
};

describe('JobMatchPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resumeDocumentService.listResumes).mockResolvedValue(MOCK_RESUMES);
    vi.mocked(resumeDocumentService.listVersions).mockResolvedValue(MOCK_VERSIONS);
    vi.mocked(jobMatchService.listJobMatches).mockResolvedValue([]);
  });

  it('renders workspace with headers, selectors, SSRF notice, and BYOK input', async () => {
    render(
      <MemoryRouter>
        <JobMatchPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /AI Job Description Matcher/i
    );
    expect(screen.getByText(/Match Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/History & Reports/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Senior Full Stack AI Developer/i)).toBeInTheDocument();
    });

    // SSRF security callout is visible
    expect(screen.getByText(/Direct web URL scraping is disallowed/i)).toBeInTheDocument();
  });

  it('performs job match analysis and displays score breakdown and requirements', async () => {
    vi.mocked(jobMatchService.analyzeJobMatch).mockResolvedValueOnce(MOCK_REPORT_DETAIL);

    render(
      <MemoryRouter>
        <JobMatchPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Senior Full Stack AI Developer/i)).toBeInTheDocument();
    });

    // Enter job description (>= 50 chars)
    const textarea = screen.getByPlaceholderText(/Paste the full job posting requirements/i);
    fireEvent.change(textarea, {
      target: {
        value:
          'We are looking for a Senior AI Developer with strong background in Python, PyTorch, and distributed training systems.',
      },
    });

    // Click Analyze button
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Match & Fit/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(jobMatchService.analyzeJobMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          resume_id: 'res-123',
          job_description: expect.stringContaining('Senior AI Developer'),
        })
      );
    });

    // Verify report details rendered
    await waitFor(() => {
      expect(screen.getByText('Lead AI Engineer')).toBeInTheDocument();
      expect(screen.getByText(/Anthropic Labs/i)).toBeInTheDocument();
      expect(screen.getByText('Python & FastAPI')).toBeInTheDocument();
      expect(screen.getByText('PyTorch deep learning')).toBeInTheDocument();
      expect(screen.getByText(/Verifiable Keywords Found on Resume/i)).toBeInTheDocument();
    });
  });

  it('handles recommendations selection, user confirmation, and opens tailoring modal', async () => {
    vi.mocked(jobMatchService.analyzeJobMatch).mockResolvedValueOnce(MOCK_REPORT_DETAIL);
    vi.mocked(jobMatchService.tailorResumeDraft).mockResolvedValueOnce({
      report_id: 'report-999',
      resume_id: 'res-123',
      resume_version_id: 'v-101',
      original_resume_data: {} as never,
      tailored_resume_data: {} as never,
      applied_recommendations: [MOCK_REPORT_DETAIL.recommendations[0]],
      diff_summary: [
        {
          section: 'Technical Skills',
          original: 'General ML skills',
          tailored: 'Deep Learning: PyTorch, TensorFlow, Hugging Face Transformers',
        },
      ],
    });

    render(
      <MemoryRouter>
        <JobMatchPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Senior Full Stack AI Developer/i)).toBeInTheDocument();
    });

    // Populate inputs & analyze
    const textarea = screen.getByPlaceholderText(/Paste the full job posting requirements/i);
    fireEvent.change(textarea, {
      target: {
        value: 'Job description long enough to satisfy minimum requirement count of 50 characters here.',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Analyze Match & Fit/i }));

    await waitFor(() => {
      expect(screen.getByText('Tailoring Recommendations (2)')).toBeInTheDocument();
    });

    // Check anti-hallucination user confirmation banner
    expect(screen.getByText(/Factual Confirmation Required/i)).toBeInTheDocument();

    // Click Generate Tailored Draft
    const tailorBtn = screen.getByRole('button', { name: /Generate Tailored Draft/i });
    fireEvent.click(tailorBtn);

    await waitFor(() => {
      expect(jobMatchService.tailorResumeDraft).toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: /Tailored Resume Draft & Diff Summary/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm & Save Tailored Resume/i })).toBeInTheDocument();
    });
  });

  it('switches to history tab and displays previous job matches', async () => {
    vi.mocked(jobMatchService.listJobMatches).mockResolvedValueOnce([
      {
        id: 'hist-1',
        resume_id: 'res-123',
        resume_version_id: 'v-101',
        job_title: 'Founding ML Engineer',
        company_name: 'OpenPlatform',
        overall_score: 95,
        required_skills_score: 98,
        keyword_score: 92,
        status: 'completed',
        scoring_version: 'v1.0',
        created_at: new Date().toISOString(),
      },
    ]);

    render(
      <MemoryRouter>
        <JobMatchPage />
      </MemoryRouter>
    );

    const historyTab = screen.getByRole('button', { name: /History & Reports/i });
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('Saved Job Match Reports')).toBeInTheDocument();
      expect(screen.getByText('Founding ML Engineer')).toBeInTheDocument();
      expect(screen.getByText(/OpenPlatform/i)).toBeInTheDocument();
      expect(screen.getByText(/95% Match/i)).toBeInTheDocument();
    });
  });
});
