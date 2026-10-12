import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div role="status" className="space-y-6 animate-pulse" aria-label="Loading analysis dashboard">
      {/* Overview Skeleton */}
      <div className="bg-[#141419] rounded-2xl border border-[#282834] p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="h-6 w-24 bg-[#1E1E26] rounded-full" />
          <div className="h-6 w-32 bg-[#1E1E26] rounded-full" />
        </div>
        <div className="h-8 w-64 bg-[#1E1E26] rounded-xl" />
        <div className="h-4 w-96 max-w-full bg-[#1E1E26] rounded-lg" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#0B0B0E] rounded-xl border border-[#282834] p-4 space-y-2">
              <div className="h-4 w-20 bg-[#1E1E26] rounded" />
              <div className="h-8 w-16 bg-[#1E1E26] rounded" />
              <div className="h-3 w-32 bg-[#1E1E26] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Findings Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-48 bg-[#141419] rounded-2xl border border-[#282834] p-6 space-y-3">
          <div className="h-5 w-36 bg-[#1E1E26] rounded" />
          <div className="h-4 w-full bg-[#1E1E26] rounded" />
          <div className="h-4 w-4/5 bg-[#1E1E26] rounded" />
          <div className="h-4 w-3/4 bg-[#1E1E26] rounded" />
        </div>
        <div className="h-48 bg-[#141419] rounded-2xl border border-[#282834] p-6 space-y-3">
          <div className="h-5 w-36 bg-[#1E1E26] rounded" />
          <div className="h-4 w-full bg-[#1E1E26] rounded" />
          <div className="h-4 w-4/5 bg-[#1E1E26] rounded" />
          <div className="h-4 w-3/4 bg-[#1E1E26] rounded" />
        </div>
      </div>

      {/* Sections Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-[#141419] rounded-2xl border border-[#282834] p-6 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-48 bg-[#1E1E26] rounded" />
              <div className="h-3 w-64 bg-[#1E1E26] rounded" />
            </div>
            <div className="h-6 w-12 bg-[#1E1E26] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingSkeleton;
