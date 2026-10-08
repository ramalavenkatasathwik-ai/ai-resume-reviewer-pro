import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import * as healthServiceModule from '../services/healthService';

describe('App Component', () => {
  it('renders landing page with headline, subtitle, and navigation', async () => {
    vi.spyOn(healthServiceModule.healthService, 'checkHealth').mockResolvedValue({
      status: 'healthy',
      service: 'ai-resume-reviewer-api',
    });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Verify main brand heading and subtitle
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/AI Resume Reviewer/i);
    expect(
      screen.getByText(/AI-powered Resume, ATS and Career Analysis/i)
    ).toBeInTheDocument();

    // Verify Navigation elements specifically
    expect(screen.getByRole('link', { name: /^dashboard$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^settings$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /launch dashboard/i })).toBeInTheDocument();
  });
});
