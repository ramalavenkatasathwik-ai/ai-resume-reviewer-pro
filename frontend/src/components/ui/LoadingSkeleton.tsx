import React from 'react';

export interface LoadingSkeletonProps {
  lines?: number;
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines,
  count,
  className = '',
}) => {
  const lineCount = count !== undefined ? count : (lines !== undefined ? lines : 3);

  return (
    <div className={`space-y-2.5 animate-pulse ${className}`}>
      {Array.from({ length: lineCount }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-[#1C1C23] rounded-lg border border-[#303038]/40"
          style={{ width: `${100 - (i % 3) * 15}%` }}
        />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
