import React from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 110,
  strokeWidth = 9,
  label,
}) => {
  const normalizedScore = Math.min(100, Math.max(0, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  // Determine label and color
  const level =
    normalizedScore >= 85
      ? 'Exceptional'
      : normalizedScore >= 70
      ? 'Competitive'
      : normalizedScore >= 50
      ? 'Needs Polish'
      : 'Action Required';

  const strokeColor =
    normalizedScore >= 85
      ? '#FF7417'
      : normalizedScore >= 70
      ? '#FFA05C'
      : '#F04452';

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1C1C23"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl sm:text-3xl font-black text-[#F7F7FA] font-mono leading-none">
            {normalizedScore}
          </span>
          <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-bold mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {label && <p className="text-xs font-bold text-[#F7F7FA] mt-2">{label}</p>}
      <p className="text-[11px] font-semibold text-[#FF7417] mt-0.5">{level}</p>
    </div>
  );
};

export default ScoreRing;
