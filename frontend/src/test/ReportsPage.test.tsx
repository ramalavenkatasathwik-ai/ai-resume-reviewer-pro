import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ReportsPage } from '@/pages/ReportsPage';

describe('ReportsPage Component', () => {
  it('renders report delivery options and Phase 3 scheduled email notice', () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Reports & Deliverables/i);
    expect(screen.getByText(/Instant PDF & Print Export/i)).toBeInTheDocument();
    expect(screen.getByText(/Automated Email Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/PHASE 3 SCHEDULED/i)).toBeInTheDocument();
  });

  it('triggers browser print when clicking Browser Print button', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    const printButton = screen.getByRole('button', { name: /Browser Print/i });
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});
