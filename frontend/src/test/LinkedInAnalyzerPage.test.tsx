import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LinkedInAnalyzerPage } from '@/pages/LinkedInAnalyzerPage';
import { linkedinService } from '@/services/linkedinService';
import { LinkedInAnalysisResult } from '@/types/linkedin';

// Mock linkedinService while preserving pure helper functions like validateProfileUrl
vi.mock('@/services/linkedinService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/linkedinService')>();
  return {
    linkedinService: {
      ...actual.linkedinService,
      getSupportedModels: vi.fn().mockResolvedValue({
        models: ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
        default_model: 'gemini-2.5-flash',
      }),
      validateKey: vi.fn().mockResolvedValue({ valid: true, message: 'Key is valid' }),
      analyzeUrl: vi.fn(),
      analyzePdf: vi.fn(),
      analyzeText: vi.fn(),
    },
  };
});

const mockAnalysisResult: LinkedInAnalysisResult = {
  id: 'linkedin-eval-1234',
  input_type: 'url',
  profile_url: 'https://www.linkedin.com/in/johndoe',
  normalized_profile_url: 'https://www.linkedin.com/in/johndoe',
  target_role: 'AI Developer',
  model_used: 'gemini-2.5-flash',
  created_at: '2026-10-12T22:00:00Z',
  profile_identity: {
    name: 'Jane Doe',
    headline: 'Staff AI Engineer | LLMs & Autonomous Agents',
    location: 'San Francisco, CA',
    industry: 'Artificial Intelligence',
  },
  available_sections: ['headline', 'about', 'experience', 'skills'],
  unavailable_sections: ['recommendations', 'certifications'],
  coverage_percentage: 80,
  coverage_information: {
    assessed_sections_count: 8,
    total_possible_sections: 10,
    coverage_percentage: 80,
    calculation_methodology:
      'Assessed 8 of 10 primary profile sections against AI Developer role expectations.',
    limitations: ['Recommendations not accessible directly via URL.'],
  },
  overall_score: {
    score: 88,
    explanation:
      'Profile demonstrates exceptional alignment with Senior AI Developer expectations.',
    supporting_evidence: ['Demonstrated agentic workflow implementations'],
    recommended_actions: ['Add quantitative impact to recent roles'],
  },
  section_scores: {
    headline: {
      score: 90,
      explanation: 'Clear positioning with relevant keyword density.',
      supporting_evidence: [],
      recommended_actions: ['Add keyword'],
    },
    about: {
      score: 85,
      explanation: 'Strong narrative highlighting enterprise AI systems.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    experience: {
      score: 88,
      explanation: 'Clear technical roles with architectural responsibilities.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    skills: {
      score: 84,
      explanation: 'Core modern AI engineering stack represented.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    education: {
      score: 80,
      explanation: 'BS in Computer Science from accredited university.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    projects: {
      score: 92,
      explanation: 'High impact production AI and RAG implementations.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    certifications: {
      score: 75,
      explanation: 'Could benefit from specialized cloud machine learning certs.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    keyword_optimization: {
      score: 86,
      explanation: 'High visibility for recruiter queries.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    profile_completeness: {
      score: 90,
      explanation: 'Primary fields populated with verifiable details.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    target_role_alignment: {
      score: 88,
      explanation: 'Strong fit for Staff AI Developer openings.',
      supporting_evidence: [],
      recommended_actions: [],
    },
  },
  headline_analysis: {
    clarity_and_specificity: 'High clarity and specificity for AI roles.',
    value_proposition: 'Delivers scalable LLM applications and autonomous agents.',
    target_role_alignment: 'Directly aligned to AI Developer roles.',
    relevant_keywords: ['AI Developer', 'LLMs', 'PyTorch', 'FastAPI'],
    suggested_improved_headlines: [
      'Staff AI Developer | Generative AI & Autonomous Agent Architect',
      'Principal Machine Learning Engineer | LLM Deployment & RAG Systems',
    ],
    strengths: ['Clear role positioning'],
    weaknesses: ['Could highlight quantitative business scale'],
  },
  about_analysis: {
    is_available: true,
    career_narrative:
      'Passionate AI architect with 7+ years building enterprise neural systems.',
    evidence_of_impact: 'Scaled NLP models to 10M daily users with 99.9% uptime.',
    missing_information: ['Specific patent numbers'],
    suggested_rewritten_about:
      'AI Systems Architect specializing in production multi-agent architectures and high-throughput LLM pipelines...',
    strengths: ['Compelling executive narrative'],
    weaknesses: [],
  },
  experience_analysis: {
    is_available: true,
    roles_analyzed_count: 1,
    roles: [
      {
        job_title: 'Senior AI Engineer',
        organization: 'DeepTech Labs',
        dates: '2023 - Present',
        responsibilities: ['Led autonomous agent workflow team'],
        achievements: ['Designed low-latency RAG pipeline'],
        quantifiable_outcomes: ['Reduced query latency by 45%'],
        relevant_skills: ['FastAPI', 'LangChain', 'PostgreSQL'],
        keyword_coverage: ['RAG', 'Vector DB'],
        missing_metrics: [],
        suggested_rewritten_description:
          'Architected high-throughput RAG systems improving retrieval precision by 35%.',
      },
    ],
    overall_experience_strengths: ['Direct experience in production generative systems'],
    overall_experience_weaknesses: [],
    missing_evidence_summary: [],
  },
  education_analysis: {
    is_available: true,
    items: [],
    strengths: [],
    weaknesses: [],
  },
  skills_analysis: {
    is_available: true,
    listed_skills: ['Python', 'PyTorch', 'FastAPI'],
    role_relevant_skills: ['Python', 'PyTorch', 'FastAPI'],
    missing_or_weakly_evidenced_skills: ['Kubernetes'],
    duplicate_or_redundant_skills: [],
    suggested_skill_prioritization: ['Python', 'FastAPI'],
    skills_supported_by_evidence: ['Python', 'FastAPI'],
  },
  keyword_analysis: {
    found_keywords: ['Python', 'AI', 'FastAPI'],
    missing_critical_keywords: ['CUDA', 'TRT-LLM'],
    keyword_density_assessment: 'Optimal keyword spread across core competencies.',
    strategic_placement_advice: ['Include CUDA in skills section'],
  },
  target_role_alignment: {
    target_role: 'AI Developer',
    alignment_score: 88,
    demonstrated_competencies: ['Production LLM Engineering'],
    critical_skill_gaps: ['Distributed multi-GPU training'],
    recommended_keywords: ['vLLM', 'Triton'],
    suggested_headline: 'Staff AI Developer',
    suggested_about_summary: 'AI Systems Architect...',
    experience_improvement_points: ['Emphasize model deployment scale'],
    recommended_projects: ['Build open-source agent framework'],
    recommended_certifications: ['Google Cloud Professional ML Engineer'],
    prioritized_30_day_plan: [
      {
        week: 1,
        focus_title: 'Optimize Headline & Summary Keywords',
        action_items: [
          'Update headline with suggested variation',
          'Incorporate missing keywords in About section',
        ],
      },
      {
        week: 2,
        focus_title: 'Refactor Experience Bullets with Metrics',
        action_items: ['Replace passive verbs with metric-driven accomplishments'],
      },
      {
        week: 3,
        focus_title: 'Reorder and Endorse Target Skills',
        action_items: ['Pin Top 3 AI competencies to profile header'],
      },
      {
        week: 4,
        focus_title: 'Publish Technical Content & Connect',
        action_items: ['Post a summary of recent LLM benchmarks'],
      },
    ],
  },
  limitations: ['LinkedIn profile recommendations could not be scraped directly.'],
  disclaimer:
    'This profile evaluation is advisory and generated using Google Gemini BYOK intelligence.',
};

describe('LinkedInAnalyzerPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders page header and tabs correctly', () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/LinkedIn Profile/i);
    expect(screen.getByText(/Mode 1: LinkedIn URL/i)).toBeInTheDocument();
    expect(screen.getByText(/Mode 2: LinkedIn PDF Export/i)).toBeInTheDocument();
    expect(screen.getByText(/Fallback: Pasted Text/i)).toBeInTheDocument();
  });

  it('switches between URL, PDF, and Text tabs', () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    // Initial state: Mode 1 URL
    expect(screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\//i)).toBeInTheDocument();

    // Click PDF tab
    fireEvent.click(screen.getByText(/Mode 2: LinkedIn PDF Export/i));
    expect(screen.getByText(/Upload LinkedIn "Save to PDF" Export/i)).toBeInTheDocument();

    // Click Text tab
    fireEvent.click(screen.getByText(/Fallback: Pasted Text/i));
    expect(
      screen.getByPlaceholderText(/Paste headline, About section, experience roles/i)
    ).toBeInTheDocument();
  });

  it('validates LinkedIn URL input in real time and handles Validate URL button', () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\//i);
    const validateBtn = screen.getByTestId('validate-url-button');

    // Click validate button with empty input
    fireEvent.click(validateBtn);
    expect(screen.getByText(/Please enter a LinkedIn profile URL/i)).toBeInTheDocument();

    // Enter invalid non-profile URL
    fireEvent.change(input, { target: { value: 'https://linkedin.com/jobs/view/1234' } });
    expect(screen.getByText(/Must be linkedin.com\/in\/username/i)).toBeInTheDocument();

    fireEvent.click(validateBtn);
    expect(screen.getByText(/Job postings are not supported/i)).toBeInTheDocument();

    // Enter insecure HTTP URL
    fireEvent.change(input, { target: { value: 'http://www.linkedin.com/in/john-doe' } });
    fireEvent.click(validateBtn);
    expect(screen.getByText(/Insecure HTTP is not allowed/i)).toBeInTheDocument();

    // Enter valid profile URL
    fireEvent.change(input, { target: { value: 'https://www.linkedin.com/in/john-doe' } });
    expect(screen.getByText(/Valid profile link/i)).toBeInTheDocument();

    fireEvent.click(validateBtn);
    expect(screen.getByText(/Valid LinkedIn profile URL/i)).toBeInTheDocument();
  });

  it('allows selecting target roles and entering custom role, defaulting to AI Developer', () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    // Initial default role is AI Developer (highlighted)
    const aiDevBtn = screen.getByRole('button', { name: 'AI Developer' });
    expect(aiDevBtn).toHaveClass('from-[#C91432]');

    // Click preset role Data Analyst
    const dataAnalystBtn = screen.getByRole('button', { name: 'Data Analyst' });
    fireEvent.click(dataAnalystBtn);
    expect(dataAnalystBtn).toHaveClass('from-[#C91432]');

    // Switch to custom role
    const customToggle = screen.getByText(/Enter custom role/i);
    fireEvent.click(customToggle);

    const customInput = screen.getByPlaceholderText(/e.g. Lead Robotics Engineer/i);
    expect(customInput).toBeInTheDocument();
    fireEvent.change(customInput, { target: { value: 'Lead Robotics Engineer' } });
    expect(customInput).toHaveValue('Lead Robotics Engineer');
  });

  it('displays the server-side AI engine status badge', () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Server-Side AI Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Managed Server-Side/i)).toBeInTheDocument();
  });

  it('shows error if URL is invalid when clicking analyze', async () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    // Set invalid URL
    const input = screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\//i);
    fireEvent.change(input, { target: { value: 'https://evil.com/fake-profile' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze LinkedIn Profile/i });
    fireEvent.click(analyzeBtn);

    const matches = await screen.findAllByText(/Domain 'evil.com' is not supported/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('displays loading progress state while analysis is in progress', async () => {
    // Return a promise that does not resolve immediately
    let resolveAnalysis: (val: LinkedInAnalysisResult) => void;
    vi.mocked(linkedinService.analyzeUrl).mockReturnValue(
      new Promise((resolve) => {
        resolveAnalysis = resolve;
      })
    );

    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    // Provide valid URL
    const input = screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\//i);
    fireEvent.change(input, { target: { value: 'https://www.linkedin.com/in/john-doe' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze LinkedIn Profile/i });
    fireEvent.click(analyzeBtn);

    // Verify loading indicator is displayed
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Validating profile input and checking data providers/i)
    ).toBeInTheDocument();

    // Clean up pending promise
    resolveAnalysis!(mockAnalysisResult);
  });

  it('displays clear unavailable-profile-data state with fallback actions on HTTP 422 PROFILE_DATA_UNAVAILABLE without fabricated scores', async () => {
    const error422 = {
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Request failed with status code 422',
      response: {
        status: 422,
        data: {
          detail: {
            error: 'PROFILE_DATA_UNAVAILABLE',
            message:
              'A URL alone did not provide the profile content due to LinkedIn access controls. In accordance with zero-hallucination standards, no profile assessment was simulated.',
            limitations: [
              'LinkedIn enforces authentication walls for member profiles',
              'Direct HTTP scraping is prohibited and blocked by perimeter defenses',
            ],
            suggested_actions: [
              'Upload a LinkedIn "Save to PDF" profile export',
              'Provide profile text directly via the fallback text box',
            ],
            normalized_profile_url: 'https://www.linkedin.com/in/john-doe',
          },
        },
      },
    };

    vi.mocked(linkedinService.analyzeUrl).mockRejectedValue(error422);

    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    // Set valid URL
    const input = screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\//i);
    fireEvent.change(input, { target: { value: 'https://www.linkedin.com/in/john-doe' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze LinkedIn Profile/i });
    fireEvent.click(analyzeBtn);

    // Verify unavailable data panel appears
    await waitFor(() => {
      expect(screen.getByTestId('unavailable-data-panel')).toBeInTheDocument();
    });

    // Check explanation and ethical zero-hallucination policy
    expect(
      screen.getByRole('heading', { name: /A URL alone did not provide the profile content/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Zero Fabricated Scores:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/we never generate fake scores or hallucinate missing candidate data/i)
    ).toBeInTheDocument();

    // Verify that NO fabricated scores or results dashboard are shown
    expect(screen.queryByText(/Overall Profile Score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Profile Evidence Coverage/i)).not.toBeInTheDocument();

    // Verify fallback buttons exist
    const switchPdfBtn = screen.getByRole('button', { name: /Switch to PDF Upload/i });
    expect(switchPdfBtn).toBeInTheDocument();

    const pasteTextBtn = screen.getByRole('button', { name: /Paste Profile Text/i });
    expect(pasteTextBtn).toBeInTheDocument();

    // Test clicking "Switch to PDF Upload" switches to Mode 2 PDF tab
    fireEvent.click(switchPdfBtn);
    expect(screen.getByText(/Upload LinkedIn "Save to PDF" Export/i)).toBeInTheDocument();
  });

  it('renders comprehensive analysis results dashboard on successful URL analysis', async () => {
    vi.mocked(linkedinService.analyzeUrl).mockResolvedValue(mockAnalysisResult);

    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    // Set valid URL and API key
    const input = screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\//i);
    fireEvent.change(input, { target: { value: 'https://www.linkedin.com/in/johndoe' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze LinkedIn Profile/i });
    fireEvent.click(analyzeBtn);

    // Wait for analysis result to appear
    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    // Verify Candidate Identity & Overall Score
    expect(screen.getByText(/Staff AI Engineer \| LLMs & Autonomous Agents/i)).toBeInTheDocument();
    expect(screen.getAllByText('88').length).toBeGreaterThan(0);
    expect(screen.getByText('/100')).toBeInTheDocument();
    expect(screen.getByText(/Overall Profile Score/i)).toBeInTheDocument();

    // Verify Profile Evidence Coverage Indicator
    expect(screen.getByText(/Profile Evidence Coverage: 80%/i)).toBeInTheDocument();
    expect(screen.getByText(/8 of 10 standard sections evaluated/i)).toBeInTheDocument();

    // Verify Section Breakdown
    expect(screen.getByText(/Section Score Breakdown/i)).toBeInTheDocument();

    // Verify Headline Analysis
    expect(screen.getByText(/Headline & Identity Positioning/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Staff AI Developer \| Generative AI & Autonomous Agent Architect/i)
    ).toBeInTheDocument();

    // Verify Action Plan
    expect(
      screen.getByText(/Prioritized 30-Day Profile Improvement Plan/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/WEEK 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Optimize Headline & Summary Keywords/i)).toBeInTheDocument();

    // Verify New Analysis button resets results
    const newAnalysisBtn = screen.getByRole('button', { name: /New Analysis/i });
    fireEvent.click(newAnalysisBtn);
    expect(screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\//i)).toBeInTheDocument();
  });

  it('displays error banner when backend analysis returns a server error', async () => {
    const error500 = {
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Internal Server Error',
      response: {
        status: 500,
        data: {
          message: 'Gemini upstream API quota exceeded. Please check your API quota or billing.',
        },
      },
    };

    vi.mocked(linkedinService.analyzeUrl).mockRejectedValue(error500);

    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\//i);
    fireEvent.change(input, { target: { value: 'https://www.linkedin.com/in/john-doe' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze LinkedIn Profile/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Analysis Error/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Gemini upstream API quota exceeded/i)
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // PDF Mode Tests
  // -------------------------------------------------------------------------

  it('switches to PDF mode and allows selecting, replacing, and removing a PDF file', () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    // Switch to PDF tab
    fireEvent.click(screen.getByText(/Mode 2: LinkedIn PDF Export/i));
    expect(screen.getByText(/Upload LinkedIn "Save to PDF" Export/i)).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    // Select valid PDF
    const file = new File(['%PDF-1.4 test content'], 'linkedin_jane_doe.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // File name and size should be shown
    expect(screen.getByText('linkedin_jane_doe.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Replace/i })).toBeInTheDocument();

    // Click remove
    fireEvent.click(screen.getByRole('button', { name: /Remove/i }));
    expect(screen.queryByText('linkedin_jane_doe.pdf')).not.toBeInTheDocument();
    expect(screen.getByText(/Drag and drop your LinkedIn PDF here/i)).toBeInTheDocument();
  });

  it('rejects non-PDF files and displays error in PDF mode', () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Mode 2: LinkedIn PDF Export/i));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    const textFile = new File(['hello text'], 'resume.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [textFile] } });

    expect(
      screen.getByText(/Please upload a PDF file \(\.pdf\) generated by LinkedIn/i)
    ).toBeInTheDocument();
  });

  it('rejects empty PDF files (0 bytes) in PDF mode', () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Mode 2: LinkedIn PDF Export/i));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [emptyFile] } });

    expect(
      screen.getByText(/Uploaded PDF file is empty \(0 bytes\)/i)
    ).toBeInTheDocument();
  });

  it('rejects oversized PDF files (>10MB) in PDF mode', () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Mode 2: LinkedIn PDF Export/i));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Create mock oversized file
    const oversizedFile = new File(['a'], 'huge.pdf', { type: 'application/pdf' });
    Object.defineProperty(oversizedFile, 'size', { value: 12 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(
      screen.getByText(/exceeds the maximum allowed limit of 10 MB/i)
    ).toBeInTheDocument();
  });

  it('submits PDF and displays loading and analysis results dashboard with file and extraction badges', async () => {
    const mockPdfResult: LinkedInAnalysisResult = {
      ...mockAnalysisResult,
      input_type: 'pdf',
      original_filename: 'official_linkedin_export.pdf',
      extraction_method: 'embedded_text',
    };

    vi.mocked(linkedinService.analyzePdf).mockResolvedValue(mockPdfResult);

    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    // Switch to PDF tab
    fireEvent.click(screen.getByText(/Mode 2: LinkedIn PDF Export/i));

    // Select file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['%PDF-1.4 content'], 'official_linkedin_export.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Click Analyze
    const analyzeBtn = screen.getByRole('button', { name: /Analyze LinkedIn Profile/i });
    fireEvent.click(analyzeBtn);

    // Wait for analysis result to appear
    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    // Check PDF badges
    expect(screen.getByText(/MODE: PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/File: official_linkedin_export.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/Extraction: Embedded PDF Text/i)).toBeInTheDocument();

    // Check scores and action plan
    expect(screen.getByText(/Overall Profile Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Prioritized 30-Day Profile Improvement Plan/i)).toBeInTheDocument();
  });

  it('displays backend error when PDF analysis fails with encrypted or unreadable PDF', async () => {
    const errorEncrypted = {
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: {
          detail: {
            error: 'ENCRYPTED_PDF',
            message: 'Password-protected or encrypted PDF files cannot be processed. Please unlock your LinkedIn export.',
          },
        },
      },
    };

    vi.mocked(linkedinService.analyzePdf).mockRejectedValue(errorEncrypted);

    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    // Switch to PDF tab
    fireEvent.click(screen.getByText(/Mode 2: LinkedIn PDF Export/i));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['%PDF-1.4 encrypted content'], 'locked.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze LinkedIn Profile/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Analysis Error/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Password-protected or encrypted PDF files cannot be processed/i)
      ).toBeInTheDocument();
    });
  });
});
