import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LinkedInAnalyzerPage } from '@/pages/LinkedInAnalyzerPage';

vi.mock('@/services/linkedinService', () => ({
  linkedinService: {
    getSupportedModels: vi.fn().mockResolvedValue({
      models: ['gemini-2.5-flash', 'gemini-1.5-flash'],
      default_model: 'gemini-2.5-flash',
    }),
    validateKey: vi.fn().mockResolvedValue({ valid: true, message: 'Key is valid' }),
    analyzeUrl: vi.fn(),
    analyzePdf: vi.fn(),
    analyzeText: vi.fn(),
  },
}));

describe('LinkedInAnalyzerPage Component', () => {
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
    expect(screen.getByPlaceholderText(/Paste headline, About section, experience roles/i)).toBeInTheDocument();
  });

  it('validates LinkedIn URL input in real time', () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\//i);

    // Enter invalid non-profile URL
    fireEvent.change(input, { target: { value: 'https://linkedin.com/jobs/view/1234' } });
    expect(screen.getByText(/Must be linkedin.com\/in\/username/i)).toBeInTheDocument();

    // Enter valid profile URL
    fireEvent.change(input, { target: { value: 'https://www.linkedin.com/in/john-doe' } });
    expect(screen.getByText(/Valid profile link/i)).toBeInTheDocument();
  });

  it('allows selecting target roles and entering custom role', () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    // Click preset role
    const dataAnalystBtn = screen.getByRole('button', { name: 'Data Analyst' });
    fireEvent.click(dataAnalystBtn);

    // Switch to custom role
    const customToggle = screen.getByText(/Enter custom role/i);
    fireEvent.click(customToggle);

    expect(screen.getByPlaceholderText(/e.g. Lead Robotics Engineer/i)).toBeInTheDocument();
  });

  it('shows error if Gemini API key is missing when clicking analyze', async () => {
    render(
      <MemoryRouter>
        <LinkedInAnalyzerPage />
      </MemoryRouter>
    );

    const analyzeBtn = screen.getByRole('button', { name: /Analyze LinkedIn Profile/i });
    fireEvent.click(analyzeBtn);

    expect(await screen.findByText(/Please enter your Google Gemini API key/i)).toBeInTheDocument();
  });
});
