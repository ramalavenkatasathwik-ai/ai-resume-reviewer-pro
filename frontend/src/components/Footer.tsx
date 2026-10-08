import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 mt-auto text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">AI Resume Reviewer Pro</span>
          <span>&copy; {new Date().getFullYear()}</span>
          <span>&bull;</span>
          <span className="text-slate-400">Foundation Phase 1</span>
        </div>
        <div className="flex items-center gap-6 text-slate-500">
          <span>FastAPI</span>
          <span>&bull;</span>
          <span>React + Vite</span>
          <span>&bull;</span>
          <span>PostgreSQL</span>
          <span>&bull;</span>
          <span>Docker</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
