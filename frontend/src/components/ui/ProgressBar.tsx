import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = 'from-[#C91432] via-[#F04452] to-[#FF7417]',
  size = 'md',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3.5' : 'h-2.5';

  return (
    <div className="w-full space-y-1.5">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-semibold text-[#A1A1AA]">
          {label && <span>{label}</span>}
          {showPercentage && <span className="font-mono text-[#F7F7FA]">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-[#0B0B0E] rounded-full overflow-hidden border border-[#303038] ${heightClass}`}>
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
