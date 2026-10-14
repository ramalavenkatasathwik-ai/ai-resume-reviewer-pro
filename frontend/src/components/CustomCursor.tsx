import React, { useEffect, useState, useRef } from 'react';

/**
 * CustomCursor — S Letter + Sharp Arrow Pointer
 *
 * Combines a bold uppercase 'S' with a classic upper-left pointing arrowhead,
 * framed by a subtle glowing gradient, thin circular accent ring, and smooth trailing ring.
 *
 * Key Design & Usability Rules:
 * - Arrowhead tip is aligned precisely with the system mouse coordinates (hotspot).
 * - Instant 1:1 tracking for pointer accuracy with silky smooth trailing accent ring.
 * - Scales from the arrowhead tip on hover and click to avoid positional jumping.
 * - pointer-events: none ensures zero obstruction to clicks or forms.
 * - Fades over text inputs/textareas to preserve native I-beam caret.
 * - Automatically disabled on touch devices and for users with prefers-reduced-motion.
 */
export const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isInteractive, setIsInteractive] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isTextControl, setIsTextControl] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Trailing ring coordinates (smoothed via requestAnimationFrame)
  const [trailPos, setTrailPos] = useState({ x: -100, y: -100 });
  const mousePosRef = useRef({ x: -100, y: -100 });
  const trailPosRef = useRef({ x: -100, y: -100 });
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect touch-first devices with coarse pointer (phones/tablets without mouse)
    const checkTouch = () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
      return window.matchMedia('(pointer: coarse)').matches;
    };

    // Detect prefers-reduced-motion
    const checkReducedMotion = () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    };

    setIsTouchDevice(checkTouch());
    setReducedMotion(checkReducedMotion());

    // Listen for motion preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', handleMotionChange);
      return () => motionQuery.removeEventListener('change', handleMotionChange);
    }
  }, []);

  useEffect(() => {
    if (isTouchDevice || reducedMotion) return;

    // Apply class to hide standard pointer on desktop, while retaining native caret on text controls
    document.documentElement.classList.add('custom-cursor-active');

    const onMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      mousePosRef.current = { x: clientX, y: clientY };
      setPosition({ x: clientX, y: clientY });
      if (!isVisible) setIsVisible(true);

      const target = e.target as Element | null;
      if (target && typeof target.closest === 'function') {
        // Detect text inputs & textareas to preserve standard text cursors
        const textEl = target.closest('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
        setIsTextControl(Boolean(textEl));

        // Detect interactive clickable elements
        const interactiveEl = target.closest(
          'button, a, [role="button"], select, summary, label, [data-cursor-interactive], .interactive-card, input[type="submit"], input[type="button"]'
        );
        setIsInteractive(Boolean(interactiveEl));
      } else {
        setIsTextControl(false);
        setIsInteractive(false);
      }
    };

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Smooth trailing animation loop
    const animateTrail = () => {
      const targetX = mousePosRef.current.x;
      const targetY = mousePosRef.current.y;

      const currentX = trailPosRef.current.x;
      const currentY = trailPosRef.current.y;

      // Smooth lerp (0.2 factor: responsive with subtle organic lag)
      const nextX = currentX + (targetX - currentX) * 0.2;
      const nextY = currentY + (targetY - currentY) * 0.2;

      trailPosRef.current = { x: nextX, y: nextY };
      setTrailPos({ x: nextX, y: nextY });

      rafIdRef.current = requestAnimationFrame(animateTrail);
    };

    rafIdRef.current = requestAnimationFrame(animateTrail);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isTouchDevice, reducedMotion, isVisible]);

  if (isTouchDevice || reducedMotion) {
    return null;
  }

  return (
    <>
      {/* 1. Subtle Orange / Red Trailing Accent Ring */}
      <div
        className="fixed top-0 left-0 pointer-events-none rounded-full transition-all ease-out z-[9998]"
        style={{
          transform: `translate3d(${trailPos.x}px, ${trailPos.y}px, 0) translate(-50%, -50%) scale(${
            isClicking ? 0.8 : isInteractive ? 1.35 : 1
          })`,
          width: '38px',
          height: '38px',
          borderWidth: '1.5px',
          borderStyle: 'solid',
          borderColor: isInteractive ? '#F04452' : 'rgba(255, 116, 23, 0.45)',
          backgroundColor: isInteractive ? 'rgba(255, 116, 23, 0.08)' : 'rgba(201, 20, 50, 0.03)',
          boxShadow: isInteractive
            ? '0 0 16px rgba(240, 68, 82, 0.5), inset 0 0 8px rgba(255, 116, 23, 0.2)'
            : '0 0 10px rgba(255, 116, 23, 0.25)',
          opacity: isVisible && !isTextControl ? 1 : 0,
          transition: 'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, opacity 0.15s ease-out',
        }}
        aria-hidden="true"
      />

      {/* 2. Main S Letter + Sharp Arrow Pointer */}
      <div
        className="fixed top-0 left-0 pointer-events-none z-[9999] select-none"
        style={{
          // Tip of arrowhead is at (3, 3) inside SVG -> offset by (-3px, -3px) so tip matches pointer coordinates
          transform: `translate3d(${position.x}px, ${position.y}px, 0) translate(-3px, -3px) scale(${
            isClicking ? 0.9 : isInteractive ? 1.15 : 1
          })`,
          transformOrigin: '3px 3px',
          opacity: isVisible && !isTextControl ? 1 : 0,
          transition: 'transform 0.08s ease-out, opacity 0.15s ease-out',
        }}
        aria-hidden="true"
        data-testid="custom-cursor"
      >
        <svg
          width="42"
          height="42"
          viewBox="0 0 42 42"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_2px_8px_rgba(201,20,50,0.55)] drop-shadow-[0_0_14px_rgba(255,116,23,0.45)]"
        >
          <defs>
            {/* Arrowhead Gradient: Electric Orange to Bright Red */}
            <linearGradient id="cursorArrowGrad" x1="3" y1="3" x2="18" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF7417" />
              <stop offset="55%" stopColor="#F04452" />
              <stop offset="100%" stopColor="#C91432" />
            </linearGradient>

            {/* S Letter Gradient: Vibrant Bright Red to Electric Orange */}
            <linearGradient id="cursorSGrad" x1="16" y1="10" x2="36" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFA654" />
              <stop offset="35%" stopColor="#FF7417" />
              <stop offset="75%" stopColor="#F04452" />
              <stop offset="100%" stopColor="#C91432" />
            </linearGradient>

            {/* Inner Ring Gradient */}
            <linearGradient id="cursorRingGrad" x1="12" y1="12" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF7417" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#F04452" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Thin Circular Accent Ring behind S */}
          <circle
            cx="26"
            cy="25"
            r="12.5"
            stroke="url(#cursorRingGrad)"
            strokeWidth="1"
            strokeDasharray="3 2"
            fill="none"
            opacity={isInteractive ? '0.85' : '0.55'}
          />

          {/* Bold Uppercase 'S' Symbol nestled beside the pointer */}
          <text
            x="26"
            y="26"
            fontSize="19"
            fontWeight="900"
            fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            textAnchor="middle"
            dominantBaseline="central"
            fill="url(#cursorSGrad)"
            stroke="#0B0B0E"
            strokeWidth="2"
            strokeLinejoin="round"
            paintOrder="stroke fill"
            letterSpacing="-0.5"
          >
            S
          </text>

          {/* Classic Sharp Arrow Pointer pointing diagonally upper-left at (3, 3) */}
          <path
            d="M 3 3 L 3 19.5 L 7.5 15 L 11.5 24 L 15 22.5 L 11 13.5 L 18 12.5 Z"
            fill="url(#cursorArrowGrad)"
            stroke="#0B0B0E"
            strokeWidth="1.5"
            strokeLinejoin="round"
            paintOrder="stroke fill"
          />
        </svg>
      </div>
    </>
  );
};

export default CustomCursor;
