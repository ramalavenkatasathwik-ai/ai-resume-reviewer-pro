import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { resumeService } from '@/services/resumeService';

vi.mock('@/services/resumeService', () => ({
  resumeService: {
    analyzeResume: vi.fn(),
    getHistory: vi.fn(),
  },
}));

vi.mock('@/services/linkedinService', () => ({
  linkedinService: {
    getSupportedModels: vi.fn().mockResolvedValue({
      models: ['gemini-2.5-flash', 'gemini-1.5-pro'],
      default_model: 'gemini-2.5-flash',
    }),
    validateKey: vi.fn().mockResolvedValue({ valid: true, message: 'Key is valid' }),
  },
}));

describe('DashboardPage Component (Resume Analyzer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders initial resume analyzer view with upload section and empty state', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Resume Analyzer/i);
    expect(screen.getByText(/No Resume Analyzed Yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze Resume/i })).toBeInTheDocument();
  });

  it('allows choosing preset roles or entering a custom role', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // Preset role button
    const devOpsBtn = screen.getByRole('button', { name: 'DevOps Engineer' });
    fireEvent.click(devOpsBtn);

    // Toggle custom role
    const customRoleBtn = screen.getByText(/Enter custom role/i);
    fireEvent.click(customRoleBtn);

    const customInput = screen.getByPlaceholderText(/e.g. Senior Staff AI Research Engineer/i);
    expect(customInput).toBeInTheDocument();
    fireEvent.change(customInput, { target: { value: 'Principal Solutions Architect' } });
    expect(customInput).toHaveValue('Principal Solutions Architect');
  });

  it('shows error banner or disabled state when trying to analyze without a file or API key', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    const analyzeBtn = screen.getByRole('button', { name: /Analyze Resume/i });
    expect(analyzeBtn).toBeDisabled();
  });

  it('displays analysis results with ScoreRing and accordions when analysis completes', async () => {
    const mockResult = {
      candidate_information: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        location: 'San Francisco, CA',
      },
      overall_score: 88,
      ats_score: 92,
      skills_score: 85,
      content_score: 90,
      experience_score: 86,
      formatting_score: 95,
      professional_summary: 'Accomplished software engineer with 8 years of distributed systems experience.',
      strengths: ['Strong Go and Kubernetes expertise', 'Demonstrated scale of 100M+ requests/day'],
      weaknesses: ['Limited mention of front-end technologies'],
      missing_skills: ['GraphQL', 'Terraform'],
      ats_keywords: ['Microservices', 'Distributed Systems', 'Go'],
      grammar_issues: [],
      formatting_issues: [],
      recommended_skills: ['Rust', 'Apache Kafka'],
      recommended_certifications: ['AWS Certified Solutions Architect'],
      recommended_courses: [],
      interview_questions: ['Explain how you handle distributed transactions.'],
      career_suggestions: ['Target Principal / Staff tier roles.'],
      final_assessment: 'Candidate demonstrates strong qualifications for senior backend roles.',
      target_role: 'Senior Software Engineer',
      model_used: 'gemini-2.5-flash',
      disclaimer: 'AI-generated estimate for guidance only.',
    };

    vi.mocked(resumeService.analyzeResume).mockResolvedValue(mockResult);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // Provide API key
    const keyInput = screen.getByPlaceholderText(/Paste your Google Gemini API key/i);
    fireEvent.change(keyInput, { target: { value: 'AIzaSyTestKey123' } });

    // Upload file via hidden input
    const file = new File(['test pdf content'], 'my_resume.pdf', { type: 'application/pdf' });
    const hiddenFileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (hiddenFileInput) {
      fireEvent.change(hiddenFileInput, { target: { files: [file] } });
    }

    // Now analyze button should be enabled
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Resume/i });
    expect(analyzeBtn).not.toBeDisabled();
    fireEvent.click(analyzeBtn);

    // Wait for mock result to render
    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText(/Accomplished software engineer/i)).toBeInTheDocument();
      expect(screen.getByText('Candidate Strengths & Key Advantages')).toBeInTheDocument();
      expect(screen.getByText('Strong Go and Kubernetes expertise')).toBeInTheDocument();
    });
  });
});
