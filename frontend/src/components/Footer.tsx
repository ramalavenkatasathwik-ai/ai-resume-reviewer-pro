import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#303038] bg-[#0B0B0E] py-6 mt-auto text-[#A1A1AA] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
          <span className="font-semibold text-[#F7F7FA]">AI Resume & LinkedIn Analyzer Pro</span>
          <span>&copy; {new Date().getFullYear()}</span>
          <span>&bull;</span>
          <span className="inline-flex items-center gap-1 text-[#FF9B45]">
            <ShieldCheck className="w-3 h-3" />
            BYOK Privacy Architecture
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[#A1A1AA] font-mono text-[11px]">
          <span>FastAPI</span>
          <span>&bull;</span>
          <span>React + Vite</span>
          <span>&bull;</span>
          <span>PostgreSQL</span>
          <span>&bull;</span>
          <span>Google Gemini</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
