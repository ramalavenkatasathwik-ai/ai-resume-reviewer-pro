/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CareerIntelligencePage } from '@/pages/CareerIntelligencePage';
import { careerIntelligenceService } from '@/services/careerIntelligenceService';
import { resumeDocumentService } from '@/services/resumeDocumentService';

vi.mock('@/services/careerIntelligenceService', () => ({
  careerIntelligenceService: {
    generateRoleVariant: vi.fn(),
    saveRoleVariant: vi.fn(),
    compareVariants: vi.fn(),
    getWritingSuggestions: vi.fn(),
    generateRoadmap: vi.fn(),
    saveRoadmap: vi.fn(),
    listRoadmaps: vi.fn(),
    deleteRoadmap: vi.fn(),
    compareMultiRole: vi.fn(),
    saveMultiRoleComparison: vi.fn(),
    recommendProjects: vi.fn(),
  },
}));

vi.mock('@/services/resumeDocumentService', () => ({
  resumeDocumentService: {
    listResumes: vi.fn(),
    getResume: vi.fn(),
  },
}));

const MOCK_RESUMES = [
  {
    id: 'res-101',
    user_id: 'user-1',
    title: 'Alex Mercer Resume',
    target_role: 'AI Developer',
    current_version_id: 'v-1',
    is_archived: false,
    versions_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_VARIANT_DRAFT = {
  target_role: 'Python Developer',
  variant_title: 'Alex Mercer Resume (Python Developer Variant)',
  resume_data: {
    basics: {
      name: 'Alex Mercer',
      title: 'Python Developer',
      summary: 'Results-driven Python Developer.',
    },
    skills: ['Python', 'FastAPI', 'PostgreSQL'],
  },
  key_modifications: [
    'Refocused summary on Python Developer competencies.',
    'Prioritized matching technical skills.',
  ],
  verified_skills_prioritized: ['Python', 'FastAPI'],
  factual_integrity_verified: true,
  confirmation_needed_items: [],
};

const MOCK_WRITING_RESPONSE = {
  section: 'summary',
  target_role: 'AI Developer',
  editorial_notes: 'Tailored summary options',
  suggestions: [
    {
      id: 'sug-1',
      section: 'summary',
      original_text: 'Experienced engineer',
      proposed_revision: 'Spearheaded high-impact AI developer initiatives with 30% latency reduction.',
      explanation: 'Emphasizes quantifiable outcomes and ownership.',
      target_role: 'AI Developer',
      requires_user_confirmation: true,
      verification_prompt: 'Confirm whether you achieved a 30% reduction or enter actual metric.',
      action_verbs_used: ['Spearheaded'],
      metric_focus: 'Latency',
    },
    {
      id: 'sug-2',
      section: 'summary',
      original_text: 'Experienced engineer',
      proposed_revision: 'Architected scalable AI pipelines ensuring strict SLA adherence.',
      explanation: 'Focuses on architecture and reliability.',
      target_role: 'AI Developer',
      requires_user_confirmation: false,
      verification_prompt: null,
      action_verbs_used: ['Architected'],
      metric_focus: 'SLA',
    },
  ],
};

const MOCK_ROADMAP_RESPONSE = {
  id: 'rd-1',
  target_role: 'AI Developer',
  current_level: 'Associate',
  target_level: 'Senior AI Developer',
  strengths: [
    { skill: 'Python', category: 'Core', evidence: 'Used in 3 production projects' },
  ],
  skill_gaps: [
    { skill: 'PyTorch', priority: 'high', reason: 'Essential for deep learning models' },
  ],
  potential_undocumented_skills: [
    { skill: 'Docker', recommendation: 'Mention in CI/CD experience' },
  ],
  learning_topics: [
    {
      topic: 'Deep Learning with PyTorch',
      priority: 'high',
      reason: 'Key for AI roles',
      learning_objective: 'Master model training and inference',
      estimated_weeks: 4,
    },
  ],
  practical_projects: [
    {
      title: 'Neural Recommendation Engine',
      description: 'End-to-end recommender service',
      skills_demonstrated: ['PyTorch', 'FastAPI'],
    },
  ],
  portfolio_improvements: [
    { area: 'GitHub README', action: 'Add architecture diagrams' },
  ],
  certifications: [
    { name: 'AWS Certified Machine Learning', issuer: 'Amazon', relevance: 'Validates cloud ML' },
  ],
  action_items: [
    { task: 'Study PyTorch', priority: 'high', timeline: 'Week 1-4' },
  ],
  short_term_milestones: [
    { timeframe: '0-30 Days', title: 'Complete Foundations', completion_criteria: 'Build small model', priority: 'high' },
  ],
  medium_term_milestones: [
    { timeframe: '3-6 Months', title: 'Deploy to Cloud', completion_criteria: 'Host live API', priority: 'high' },
  ],
  disclaimer: 'AI career guidance recommendations do not guarantee employment, interviews, or specific salary outcomes.',
};

const MOCK_MULTI_ROLE_RESPONSE = {
  id: 'comp-1',
  resume_id: 'res-101',
  resume_version_id: 'v-1',
  roles_evaluated: ['Python Developer', 'AI Developer', 'Data Analyst'],
  best_fit_role: 'Python Developer',
  trade_offs_summary: 'Strongest immediate alignment with Python Developer (88/100).',
  scoring_version: 'v1.0',
  role_results: {
    'Python Developer': {
      role: 'Python Developer',
      overall_score: 88,
      required_skills_score: 90,
      experience_score: 85,
      keyword_score: 85,
      evidenced_skills: ['Python', 'FastAPI', 'PostgreSQL'],
      missing_required_skills: [],
      missing_preferred_skills: ['Celery'],
      experience_alignment_summary: 'Strong alignment with Python development.',
      recommended_variant_title: 'Alex Mercer - Python Specialist',
      suggested_improvements: ['Highlight async experience'],
    },
    'AI Developer': {
      role: 'AI Developer',
      overall_score: 65,
      required_skills_score: 60,
      experience_score: 70,
      keyword_score: 65,
      evidenced_skills: ['Python'],
      missing_required_skills: ['PyTorch', 'TensorFlow'],
      missing_preferred_skills: ['LangChain'],
      experience_alignment_summary: 'Moderate alignment with AI engineering.',
      recommended_variant_title: 'Alex Mercer - AI Developer Candidate',
      suggested_improvements: ['Add machine learning project evidence'],
    },
    'Data Analyst': {
      role: 'Data Analyst',
      overall_score: 55,
      required_skills_score: 50,
      experience_score: 60,
      keyword_score: 55,
      evidenced_skills: ['SQL'],
      missing_required_skills: ['Tableau', 'Power BI'],
      missing_preferred_skills: ['Snowflake'],
      experience_alignment_summary: 'Requires visualization upskilling.',
      recommended_variant_title: 'Alex Mercer - Data Analyst',
      suggested_improvements: ['Build BI dashboards'],
    },
  },
};

const MOCK_PROJECTS_RESPONSE = {
  target_role: 'AI Developer',
  projects: [
    {
      id: 'proj-1',
      title: 'Real-Time LLM Telemetry Platform',
      target_role: 'AI Developer',
      problem_statement: 'High latency and unmonitored LLM token costs in production environments.',
      skills_demonstrated: ['Python', 'FastAPI', 'Prometheus', 'Docker'],
      tech_stack: ['Python', 'FastAPI', 'Prometheus', 'Docker'],
      core_features: ['Asynchronous token stream inspection', 'Real-time Prometheus metrics exporter'],
      milestones: [{ phase: 'Phase 1: Instrumentation', deliverable: 'Telemetry exporter' }],
      deliverables: ['Public GitHub repository with documentation'],
      resume_documentation_guide: ['Architected a real-time LLM telemetry engine using Python and FastAPI.'],
      is_proposed: true,
      guardrail_notice: 'PROPOSED PROJECT: Not yet completed. Never add to resume until implemented and verified.',
    },
  ],
};

describe('CareerIntelligencePage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resumeDocumentService.listResumes).mockResolvedValue(MOCK_RESUMES as any);
    vi.mocked(careerIntelligenceService.generateRoleVariant).mockResolvedValue(MOCK_VARIANT_DRAFT as any);
    vi.mocked(careerIntelligenceService.compareVariants).mockResolvedValue({
      base_title: 'Original',
      variant_title: 'Variant',
      target_role: 'Python Developer',
      sections: [],
      summary_of_differences: ['Title aligned to Python Developer'],
    });
    vi.mocked(careerIntelligenceService.getWritingSuggestions).mockResolvedValue(MOCK_WRITING_RESPONSE as any);
    vi.mocked(careerIntelligenceService.generateRoadmap).mockResolvedValue(MOCK_ROADMAP_RESPONSE as any);
    vi.mocked(careerIntelligenceService.saveRoadmap).mockResolvedValue(MOCK_ROADMAP_RESPONSE as any);
    vi.mocked(careerIntelligenceService.listRoadmaps).mockResolvedValue([MOCK_ROADMAP_RESPONSE as any]);
    vi.mocked(careerIntelligenceService.compareMultiRole).mockResolvedValue(MOCK_MULTI_ROLE_RESPONSE as any);
    vi.mocked(careerIntelligenceService.recommendProjects).mockResolvedValue(MOCK_PROJECTS_RESPONSE as any);
  });

  it('renders page header and navigation tabs properly', async () => {
    render(
      <MemoryRouter>
        <CareerIntelligencePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/AI Career Intelligence & Role Strategy/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Multi-Version Variants/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI Writing Assistant/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Career Roadmap/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Multi-Role Comparison/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Portfolio Projects/i })).toBeInTheDocument();
  });

  it('generates role-specific resume variant successfully', async () => {
    render(
      <MemoryRouter>
        <CareerIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Alex Mercer Resume/i)).toBeInTheDocument();
    });

    const generateBtn = screen.getByRole('button', { name: /Generate AI Developer Variant/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(careerIntelligenceService.generateRoleVariant).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/Alex Mercer Resume \(Python Developer Variant\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Refocused summary on Python Developer competencies/i)).toBeInTheDocument();
    });
  });

  it('navigates to AI Writing Assistant and renders all 8 career sections', async () => {
    render(
      <MemoryRouter>
        <CareerIntelligencePage />
      </MemoryRouter>
    );

    const writingTab = screen.getByRole('button', { name: /AI Writing Assistant/i });
    fireEvent.click(writingTab);

    expect(screen.getByText(/AI Career Writing Assistant/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    const generateBtn = screen.getByRole('button', { name: /Generate 3 Revisions/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(careerIntelligenceService.getWritingSuggestions).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/Spearheaded high-impact AI developer initiatives/i)).toBeInTheDocument();
      expect(screen.getByText(/Verification Needed/i)).toBeInTheDocument();
    });
  });

  it('navigates to Career Roadmap and displays progression milestones and disclaimer', async () => {
    render(
      <MemoryRouter>
        <CareerIntelligencePage />
      </MemoryRouter>
    );

    const roadmapTab = screen.getByRole('button', { name: /Career Roadmap/i });
    fireEvent.click(roadmapTab);

    expect(screen.getByText(/Personalized Career Progression Roadmap/i)).toBeInTheDocument();

    const generateBtn = screen.getByRole('button', { name: /Generate Personalized Roadmap/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(careerIntelligenceService.generateRoadmap).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/Career Progression Plan: AI Developer/i)).toBeInTheDocument();
      expect(screen.getByText(/Career Guidance Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/Short-Term Milestones \(0 - 90 Days\)/i)).toBeInTheDocument();
    });
  });

  it('navigates to Multi-Role Comparison and displays comparison matrix and best fit role', async () => {
    render(
      <MemoryRouter>
        <CareerIntelligencePage />
      </MemoryRouter>
    );

    const multiRoleTab = screen.getByRole('button', { name: /Multi-Role Comparison/i });
    fireEvent.click(multiRoleTab);

    expect(screen.getByText(/Multi-Role Comparison Engine/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Alex Mercer Resume/i)).toBeInTheDocument();
    });

    const compareBtn = screen.getByRole('button', { name: /Compare 3 Roles/i });
    fireEvent.click(compareBtn);

    await waitFor(() => {
      expect(careerIntelligenceService.compareMultiRole).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/Optimal Immediate Alignment/i)).toBeInTheDocument();
      expect(screen.getByText(/Strongest immediate alignment with Python Developer/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Python Developer/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/88/i).length).toBeGreaterThan(0);
    });
  });

  it('navigates to Portfolio Projects and renders proposed project cards with guardrail notices', async () => {
    render(
      <MemoryRouter>
        <CareerIntelligencePage />
      </MemoryRouter>
    );

    const projectsTab = screen.getByRole('button', { name: /Portfolio Projects/i });
    fireEvent.click(projectsTab);

    expect(screen.getByText(/Project & Portfolio Recommendations/i)).toBeInTheDocument();

    const recommendBtn = screen.getByRole('button', { name: /Recommend Showcase Projects/i });
    fireEvent.click(recommendBtn);

    await waitFor(() => {
      expect(careerIntelligenceService.recommendProjects).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/Real-Time LLM Telemetry Platform/i)).toBeInTheDocument();
      expect(screen.getByText(/Strict Factual Guardrail/i)).toBeInTheDocument();
      expect(screen.getByText(/Resume Documentation Guide/i)).toBeInTheDocument();
    });
  });
});
