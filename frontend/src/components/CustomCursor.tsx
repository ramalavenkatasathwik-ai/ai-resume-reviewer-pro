import React, { useEffect, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isInteractive, setIsInteractive] = useState(false);
  const [isButton, setIsButton] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Detect touch-only devices or coarse pointers
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
      setIsTouchDevice(isTouch);

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setReducedMotion(prefersReduced);
    } else if (typeof window !== 'undefined') {
      setIsTouchDevice('ontouchstart' in window);
    }
  }, []);

  useEffect(() => {
    if (isTouchDevice || reducedMotion) return;

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });

      const target = e.target as HTMLElement | null;
      if (target) {
        const buttonEl = target.closest('button, [role="button"], a');
        const interactiveEl = target.closest(
          'button, a, input, select, textarea, [role="button"], [data-cursor-interactive], .interactive-card'
        );
        setIsButton(Boolean(buttonEl));
        setIsInteractive(Boolean(interactiveEl));
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [isTouchDevice, reducedMotion]);

  if (isTouchDevice || reducedMotion) {
    return null;
  }

  return (
    <>
      {/* Center Orange Dot */}
      <div
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-[#FF7417] pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out shadow-[0_0_8px_#FF7417]"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`,
        }}
        aria-hidden="true"
      />

      {/* Red-Orange Outer Ring */}
      <div
        className={`fixed top-0 left-0 rounded-full pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2 transition-all duration-150 ease-out ${
          isButton
            ? 'w-10 h-10 border-2 border-[#C91432] bg-[#FF7417]/10 scale-125 shadow-[0_0_14px_rgba(201,20,50,0.45)]'
            : isInteractive
            ? 'w-9 h-9 border border-[#FF7417] bg-[#FF7417]/5 scale-110'
            : 'w-7 h-7 border border-[#FF7417]/40 scale-100'
        }`}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`,
        }}
        aria-hidden="true"
      />
    </>
  );
};

export default CustomCursor;
