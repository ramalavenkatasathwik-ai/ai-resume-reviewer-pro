import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CustomCursor } from '@/components/CustomCursor';

describe('CustomCursor Component — S Letter + Sharp Arrow Pointer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default desktop fine pointer environment
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false, // pointer: coarse = false, prefers-reduced-motion = false
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    document.documentElement.classList.remove('custom-cursor-active');
  });

  it('renders custom cursor with bold S and arrow pointer on desktop', () => {
    render(<CustomCursor />);

    // Trigger initial mousemove to make cursor visible
    act(() => {
      fireEvent.mouseMove(window, { clientX: 200, clientY: 300 });
    });

    const cursor = screen.getByTestId('custom-cursor');
    expect(cursor).toBeInTheDocument();
    expect(cursor).toHaveClass('pointer-events-none');

    // Verify presence of S letter and SVG arrow pointer
    expect(cursor.querySelector('text')).toHaveTextContent('S');
    expect(cursor.querySelector('path')).toBeInTheDocument();
    expect(cursor.querySelector('svg')).toBeInTheDocument();

    // Verify custom-cursor-active class is added to html element
    expect(document.documentElement.classList.contains('custom-cursor-active')).toBe(true);
  });

  it('follows mouse position with exact offset so arrow tip aligns with pointer coordinates', () => {
    render(<CustomCursor />);

    act(() => {
      fireEvent.mouseMove(window, { clientX: 350, clientY: 420 });
    });

    const cursor = screen.getByTestId('custom-cursor');
    // Arrow tip at (3, 3) offset by translate(-3px, -3px) so tip matches pointer coordinates
    expect(cursor.style.transform).toContain('350px');
    expect(cursor.style.transform).toContain('420px');
    expect(cursor.style.transform).toContain('translate(-3px, -3px)');
  });

  it('detects interactive elements (buttons, links) and applies hover scale', () => {
    render(
      <div>
        <button id="test-btn">Click Me</button>
        <CustomCursor />
      </div>
    );

    const button = screen.getByRole('button', { name: /Click Me/i });

    act(() => {
      fireEvent.mouseMove(button, { clientX: 100, clientY: 100 });
    });

    const cursor = screen.getByTestId('custom-cursor');
    // On interactive hover, scale factor is 1.15
    expect(cursor.style.transform).toContain('scale(1.15)');
  });

  it('fades out over inputs and textareas to preserve standard text caret', () => {
    render(
      <div>
        <input id="test-input" type="text" placeholder="Type here..." />
        <CustomCursor />
      </div>
    );

    const input = screen.getByPlaceholderText('Type here...');

    act(() => {
      fireEvent.mouseMove(input, { clientX: 150, clientY: 150 });
    });

    const cursor = screen.getByTestId('custom-cursor');
    // When over text control, opacity is 0 so native I-beam cursor is unhindered
    expect(cursor.style.opacity).toBe('0');
  });

  it('scales down on mousedown to provide subtle click feedback', () => {
    render(<CustomCursor />);

    act(() => {
      fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
      fireEvent.mouseDown(window);
    });

    const cursor = screen.getByTestId('custom-cursor');
    expect(cursor.style.transform).toContain('scale(0.9)');

    act(() => {
      fireEvent.mouseUp(window);
    });

    expect(cursor.style.transform).toContain('scale(1)');
  });

  it('hides when mouse leaves browser window and restores on re-entry', () => {
    render(<CustomCursor />);

    act(() => {
      fireEvent.mouseMove(window, { clientX: 100, clientY: 100 });
    });

    const cursor = screen.getByTestId('custom-cursor');
    expect(cursor.style.opacity).toBe('1');

    act(() => {
      fireEvent.mouseLeave(document);
    });

    expect(cursor.style.opacity).toBe('0');

    act(() => {
      fireEvent.mouseEnter(document);
    });

    expect(cursor.style.opacity).toBe('1');
  });

  it('does not render on touch-first devices (pointer: coarse)', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('pointer: coarse'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { container } = render(<CustomCursor />);
    expect(container.firstChild).toBeNull();
    expect(document.documentElement.classList.contains('custom-cursor-active')).toBe(false);
  });

  it('does not render when prefers-reduced-motion is requested', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { container } = render(<CustomCursor />);
    expect(container.firstChild).toBeNull();
    expect(document.documentElement.classList.contains('custom-cursor-active')).toBe(false);
  });
});
