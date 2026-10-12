import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisDashboard } from '@/components/dashboard/AnalysisDashboard';
import { LoadingSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { AnalysisErrorState } from '@/components/dashboard/AnalysisErrorState';
import { CopyRewriteButton } from '@/components/dashboard/CopyRewriteButton';
import { LinkedInAnalysisResult } from '@/types/linkedin';

const mockCompleteResult: LinkedInAnalysisResult = {
  id: 'test-analysis-101',
  input_type: 'pdf',
  original_filename: 'alex_mercer_profile.pdf',
  extraction_method: 'embedded_text',
  profile_url: 'https://www.linkedin.com/in/alex-mercer',
  normalized_profile_url: 'https://www.linkedin.com/in/alex-mercer',
  target_role: 'AI Developer',
  model_used: 'gemini-2.5-flash',
  created_at: '2026-10-12T22:30:00Z',
  profile_identity: {
    name: 'Alex Mercer',
    headline: 'Senior AI Engineer | Distributed Systems & Multi-Agent Workflows',
    location: 'Austin, TX',
    industry: 'Enterprise Software',
  },
  available_sections: ['headline', 'about', 'experience', 'education', 'skills', 'projects', 'certifications'],
  unavailable_sections: ['volunteer_experience'],
  coverage_percentage: 85,
  coverage_information: {
    assessed_sections_count: 9,
    total_possible_sections: 10,
    coverage_percentage: 85,
    calculation_methodology: 'Evaluated against high-seniority AI Developer benchmarks.',
    limitations: ['Direct recommendations unavailable via static export.'],
  },
  overall_score: {
    score: 87,
    explanation: 'High technical alignment with modern generative agent architecture.',
    supporting_evidence: ['Strong evidence of high-scale PyTorch inference pipelines'],
    recommended_actions: ['Add latency reduction metrics to experience roles'],
  },
  section_scores: {
    headline: {
      score: 90,
      explanation: 'Compelling technical keywords and clear positioning.',
      supporting_evidence: ['Includes Multi-Agent Workflows'],
      recommended_actions: ['Consider adding secondary framework keyword'],
    },
    about: {
      score: 82,
      explanation: 'Engaging narrative detailing enterprise AI track record.',
      supporting_evidence: [],
      recommended_actions: ['Quantify business impact on cost reduction'],
    },
    experience: {
      score: 88,
      explanation: 'Strong role progression with deep technical ownership.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    skills: {
      score: 85,
      explanation: 'Covers essential model deployment and agent frameworks.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    education: {
      score: 80,
      explanation: 'MS in Computer Science with ML specialization.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    projects: {
      score: 92,
      explanation: 'Demonstrated open-source autonomous agent framework.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    certifications: {
      score: 78,
      explanation: 'Google Cloud Professional Cloud Architect active.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    keyword_optimization: {
      score: 86,
      explanation: 'Optimal density for recruiter Boolean queries.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    profile_completeness: {
      score: 90,
      explanation: 'All primary fields populated with verifiable details.',
      supporting_evidence: [],
      recommended_actions: [],
    },
    target_role_alignment: {
      score: 88,
      explanation: 'High match probability for Senior/Staff AI roles.',
      supporting_evidence: [],
      recommended_actions: [],
    },
  },
  strengths: ['Deep expertise in multi-agent orchestration', 'Production LLM serving experience'],
  weaknesses: ['Limited financial ROI metrics in summary'],
  headline_analysis: {
    clarity_and_specificity: 'Clear and immediately communicates specialty.',
    value_proposition: 'Architects robust multi-agent systems at scale.',
    target_role_alignment: 'Exemplary alignment with AI Developer role.',
    relevant_keywords: ['AI Developer', 'Multi-Agent', 'Distributed Systems'],
    suggested_improved_headlines: [
      'Staff AI Developer | Autonomous Agents & High-Throughput Inference',
      'Principal AI Architect | Distributed GenAI Systems',
    ],
    strengths: ['Direct target role keyword in headline'],
    weaknesses: ['Could specify cloud provider'],
  },
  about_analysis: {
    is_available: true,
    career_narrative: 'AI specialist leading cross-functional engineering teams...',
    evidence_of_impact: 'Cut token inference costs by 40% across 500k monthly calls.',
    missing_information: ['Specific budget allocations'],
    suggested_rewritten_about:
      'Senior AI Systems Engineer with 8+ years architecting enterprise agents and low-latency LLM microservices...',
    strengths: ['Structured narrative flow'],
    weaknesses: ['Could lead with strongest dollar impact metric'],
  },
  experience_analysis: {
    is_available: true,
    roles_analyzed_count: 1,
    roles: [
      {
        job_title: 'Lead AI Engineer',
        organization: 'Apex Cognition',
        dates: '2022 - Present',
        responsibilities: ['Architect autonomous multi-agent pipelines'],
        achievements: ['Decreased multi-agent consensus latency by 35%'],
        quantifiable_outcomes: ['35% latency drop', '40% cost reduction'],
        relevant_skills: ['FastAPI', 'PyTorch', 'vLLM', 'PostgreSQL'],
        keyword_coverage: ['LLMs', 'Vector Databases'],
        missing_metrics: [],
        suggested_rewritten_description:
          'Spearheaded development of fault-tolerant multi-agent pipelines, reducing consensus latency by 35% and saving $250k annually.',
      },
    ],
    overall_experience_strengths: ['Hands-on architecture with proven performance benchmarks'],
    overall_experience_weaknesses: [],
    missing_evidence_summary: [],
  },
  education_analysis: {
    is_available: true,
    items: [
      {
        institution: 'University of Texas at Austin',
        degree: 'Master of Science',
        field_of_study: 'Computer Science',
        dates: '2016 - 2018',
        achievements: ['Thesis on distributed neural training'],
        relevance_to_target_role: 'Direct foundation in core machine learning systems',
      },
    ],
    strengths: ['Target-relevant postgraduate degree'],
    weaknesses: [],
  },
  skills_analysis: {
    is_available: true,
    listed_skills: ['Python', 'FastAPI', 'PyTorch', 'Docker'],
    role_relevant_skills: ['Python', 'FastAPI', 'PyTorch'],
    missing_or_weakly_evidenced_skills: ['Triton Inference Server'],
    duplicate_or_redundant_skills: [],
    suggested_skill_prioritization: ['PyTorch', 'Autonomous Agents', 'FastAPI'],
    skills_supported_by_evidence: ['Python', 'PyTorch'],
  },
  project_analysis: {
    is_available: true,
    items: [
      {
        title: 'AgenticBench Open Source',
        technical_stack: ['Python', 'FastAPI', 'Chromadb'],
        problem_and_solution: 'Standardized evaluation benchmark for multi-agent negotiation frameworks.',
        outcomes_and_impact: '1,200 GitHub stars and adopted by 4 enterprise labs.',
        missing_details: [],
        suggested_rewritten_description:
          'Created AgenticBench, an open-source evaluation suite adopted by 1,200+ developers.',
      },
    ],
    strengths: ['Verified open-source repository impact'],
    weaknesses: [],
  },
  certifications_analysis: ['Google Cloud Professional Cloud Architect'],
  additional_sections: {
    certifications: ['Google Cloud Professional Cloud Architect'],
    courses: ['Deep Learning Specialization (Coursera)'],
    publications: ['Scalable Consensus in Heterogeneous Agent Systems (2024)'],
    volunteer_experience: [],
    honors_and_awards: ['Apex Engineering Hackathon 1st Place'],
    languages: ['English (Native)', 'Spanish (Professional)'],
    unavailable_sections_notes: [],
  },
  keyword_analysis: {
    found_keywords: ['Python', 'PyTorch', 'FastAPI', 'Distributed Systems'],
    missing_critical_keywords: ['Triton', 'TensorRT-LLM'],
    keyword_density_assessment: 'Strong keyword presence throughout experience and headline.',
    strategic_placement_advice: ['Include TensorRT-LLM in skills and recent role descriptions'],
  },
  target_role_alignment: {
    target_role: 'AI Developer',
    alignment_score: 88,
    demonstrated_competencies: ['Multi-Agent Architecture', 'Distributed Model Serving'],
    critical_skill_gaps: ['Kernel optimization via Triton'],
    recommended_keywords: ['Triton', 'TensorRT-LLM'],
    suggested_headline: 'Staff AI Developer',
    suggested_about_summary: 'Senior AI Systems Engineer with 8+ years...',
    experience_improvement_points: ['Emphasize exact GPU cluster configurations'],
    recommended_projects: ['Publish Triton deployment template on GitHub'],
    recommended_certifications: ['NVIDIA Certified Associate: Generative AI'],
    prioritized_30_day_plan: [
      {
        week: 1,
        focus_title: 'Headline & Keyword Positioning',
        action_items: [
          'Update headline with autonomous agents specialization',
          'Add missing keywords to profile skills',
        ],
      },
      {
        week: 2,
        focus_title: 'Experience Metric Hardening',
        action_items: ['Incorporate $250k savings figure into Lead AI Engineer role'],
      },
      {
        week: 3,
        focus_title: 'Portfolio & Project Showcase',
        action_items: ['Link AgenticBench repository in featured section'],
      },
      {
        week: 4,
        focus_title: 'Recruiter Outreach & Network Expansion',
        action_items: ['Engage with 5 engineering directors in AI infrastructure'],
      },
    ],
  },
  limitations: ['LinkedIn profile recommendations could not be scraped directly.'],
  disclaimer:
    'This profile evaluation is advisory and generated using Google Gemini BYOK intelligence.',
};

describe('AnalysisDashboard and Subcomponents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders complete dashboard with profile identity, score cards, and metadata badges', () => {
    const onNewAnalysis = vi.fn();
    render(<AnalysisDashboard result={mockCompleteResult} onNewAnalysis={onNewAnalysis} />);

    // Profile identity
    expect(screen.getByText('Alex Mercer')).toBeInTheDocument();
    expect(screen.getByText(/Senior AI Engineer \| Distributed Systems/i)).toBeInTheDocument();
    expect(screen.getByText(/Austin, TX/i)).toBeInTheDocument();

    // Mode badges
    expect(screen.getByText(/MODE: PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/File: alex_mercer_profile.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/Extraction: Embedded PDF Text/i)).toBeInTheDocument();
    expect(screen.getByText(/Target: AI Developer/i)).toBeInTheDocument();

    // Scores
    expect(screen.getAllByText('87').length).toBeGreaterThan(0);
    expect(screen.getByText('/100')).toBeInTheDocument();
    expect(screen.getByText(/Overall Profile Score/i)).toBeInTheDocument();
    expect(screen.getByText(/ATS Role Match/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Completeness/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Keyword Density/i)).toBeInTheDocument();

    // Coverage
    expect(screen.getByText(/Profile Evidence Coverage: 85%/i)).toBeInTheDocument();
    expect(screen.getByText(/9 of 10 standard sections evaluated/i)).toBeInTheDocument();
  });

  it('handles missing scores and missing fields gracefully without errors', () => {
    const minimalResult: LinkedInAnalysisResult = {
      ...mockCompleteResult,
      overall_score: { score: 70, explanation: '', supporting_evidence: [], recommended_actions: [] },
      section_scores: {} as unknown as LinkedInAnalysisResult['section_scores'], // Missing section scores
      profile_identity: { name: 'Anonymous User' },
    };

    render(<AnalysisDashboard result={minimalResult} />);
    expect(screen.getByText('Anonymous User')).toBeInTheDocument();
    // Non-available scores display "Not available" cleanly
    const notAvailablePills = screen.getAllByText('Not available');
    expect(notAvailablePills.length).toBeGreaterThan(0);
  });

  it('renders executive key findings with strengths, weaknesses, and recommendations', () => {
    render(<AnalysisDashboard result={mockCompleteResult} />);

    expect(screen.getByText(/Executive Key Findings/i)).toBeInTheDocument();
    expect(screen.getByText(/Strongest Profile Areas/i)).toBeInTheDocument();
    expect(screen.getByText(/Deep expertise in multi-agent orchestration/i)).toBeInTheDocument();
    expect(screen.getByText(/Priority Areas for Improvement/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing Evidence & Omissions/i)).toBeInTheDocument();
    expect(screen.getByText(/High-Impact Strategic Fixes/i)).toBeInTheDocument();
  });

  it('renders section-by-section analysis and section score breakdown', () => {
    render(<AnalysisDashboard result={mockCompleteResult} />);

    expect(screen.getByText(/Section Score Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Headline & Identity Positioning/i)).toBeInTheDocument();
    expect(screen.getByText(/About Section & Narrative Impact/i)).toBeInTheDocument();
    expect(screen.getByText(/Experience & Role Achievements/i)).toBeInTheDocument();
    expect(screen.getByText(/Education & Academic Qualifications/i)).toBeInTheDocument();
    expect(screen.getByText(/Skills Matrix & Keyword Search Optimization/i)).toBeInTheDocument();
    expect(screen.getByText(/Projects & Technical Implementations/i)).toBeInTheDocument();
    expect(screen.getByText(/Certifications, Courses & Additional Sections/i)).toBeInTheDocument();
    expect(screen.getByText(/Keyword Search Visibility & Placement/i)).toBeInTheDocument();

    // Check specific role and academic content
    expect(screen.getAllByText('Lead AI Engineer').length).toBeGreaterThan(0);
    expect(screen.getByText('Apex Cognition')).toBeInTheDocument();
    expect(screen.getByText('University of Texas at Austin')).toBeInTheDocument();
    expect(screen.getByText('AgenticBench Open Source')).toBeInTheDocument();
  });

  it('renders target-role alignment benchmark and keyword chips with advisory notice', () => {
    render(<AnalysisDashboard result={mockCompleteResult} />);

    expect(screen.getByText(/Target-Role Alignment Benchmark/i)).toBeInTheDocument();
    expect(screen.getByText(/Demonstrated Competencies for AI Developer/i)).toBeInTheDocument();
    expect(screen.getByText(/Multi-Agent Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/Critical Skill Gaps to Bridge/i)).toBeInTheDocument();
    expect(screen.getByText(/Kernel optimization via Triton/i)).toBeInTheDocument();
    expect(screen.getByText(/Recruiter Search Keyword Optimization/i)).toBeInTheDocument();
    expect(screen.getByText(/Recruiter Filter Advisory:/i)).toBeInTheDocument();
  });

  it('renders AI rewrite workspace with copy buttons and fact-checking notice', () => {
    render(<AnalysisDashboard result={mockCompleteResult} />);

    expect(screen.getByText(/AI Profile Rewrite Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Fact-Checking & Authenticity Notice:/i)).toBeInTheDocument();
    expect(screen.getByText(/High-Impact Headline Variations/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Staff AI Developer \| Autonomous Agents & High-Throughput Inference/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Rewritten About \/ Executive Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Metric-Driven Experience Bullet Rewrites/i)).toBeInTheDocument();
  });

  it('interacts with interactive career action plan and calculates progress', () => {
    render(<AnalysisDashboard result={mockCompleteResult} />);

    expect(
      screen.getByText(/Prioritized 30-Day Profile Improvement Plan/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/WEEK 1/i)).toBeInTheDocument();
    expect(screen.getByText(/WEEK 2/i)).toBeInTheDocument();
    expect(screen.getByText(/WEEK 3/i)).toBeInTheDocument();
    expect(screen.getByText(/WEEK 4/i)).toBeInTheDocument();

    // Initial session progress: 0 of 5 (0%)
    expect(screen.getByText(/Session Progress:/i)).toBeInTheDocument();
    expect(screen.getByText(/0 of 5/i)).toBeInTheDocument();

    // Click first action item
    const firstTask = screen.getByText(/Update headline with autonomous agents specialization/i);
    fireEvent.click(firstTask);

    // Progress updates to 1 of 5 (20%)
    expect(screen.getByText(/1 of 5/i)).toBeInTheDocument();

    // Reset button should now appear
    const resetBtn = screen.getByRole('button', { name: /Reset/i });
    expect(resetBtn).toBeInTheDocument();

    // Click reset button
    fireEvent.click(resetBtn);
    expect(screen.getByText(/0 of 5/i)).toBeInTheDocument();
  });

  it('triggers print and handles disabled email report button with coming soon badge', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const onNewAnalysis = vi.fn();

    render(<AnalysisDashboard result={mockCompleteResult} onNewAnalysis={onNewAnalysis} />);

    // Print button
    const printBtn = screen.getByRole('button', { name: /Print \/ Save PDF Report/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalled();

    // Email button is disabled with coming soon badge
    const emailBtn = screen.getByRole('button', { name: /Email Report/i });
    expect(emailBtn).toBeDisabled();
    expect(screen.getByText(/Coming Soon/i)).toBeInTheDocument();

    // New analysis button triggers callback
    const newAnalysisBtn = screen.getByRole('button', { name: /New Analysis/i });
    fireEvent.click(newAnalysisBtn);
    expect(onNewAnalysis).toHaveBeenCalled();
  });

  it('copies text and provides visual feedback using CopyRewriteButton', async () => {
    // Mock navigator.clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CopyRewriteButton textToCopy="Staff AI Engineer" label="Copy Headline" />);

    const copyBtn = screen.getByRole('button', { name: /Copy Headline/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('Staff AI Engineer');
    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
  });

  it('renders LoadingSkeleton and AnalysisErrorState cleanly', () => {
    const onRetry = vi.fn();
    const onReset = vi.fn();

    // Test skeleton
    const { unmount } = render(<LoadingSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    unmount();

    // Test error state
    render(
      <AnalysisErrorState
        title="Gemini Quota Exceeded"
        message="Please check your API key quota."
        onRetry={onRetry}
        onReset={onReset}
      />
    );

    expect(screen.getByText('Gemini Quota Exceeded')).toBeInTheDocument();
    expect(screen.getByText('Please check your API key quota.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Retry Analysis/i }));
    expect(onRetry).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Start Over/i }));
    expect(onReset).toHaveBeenCalled();
  });
});
