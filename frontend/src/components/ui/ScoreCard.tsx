import React from 'react';

interface ScoreCardProps {
  title: string;
  score: number;
  explanation?: string;
  icon?: React.ReactNode;
  recommendation?: string;
  statusText?: string;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  title,
  score,
  explanation,
  icon,
  recommendation,
  statusText,
}) => {
  const normalizedScore = Math.min(100, Math.max(0, Math.round(score)));

  const badgeColor =
    normalizedScore >= 85
      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
      : normalizedScore >= 70
      ? 'bg-amber-950/60 text-[#FF9B45] border-amber-800/60'
      : 'bg-rose-950/60 text-[#F04452] border-rose-800/60';

  return (
    <div className="bg-[#141419] rounded-xl border border-[#303038] p-4 flex flex-col justify-between space-y-3 transition-colors hover:border-[#FF7417]/50">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {icon && <span className="text-[#FF7417] text-xs">{icon}</span>}
            <h4 className="text-xs font-bold text-[#F7F7FA] capitalize">{title}</h4>
          </div>
          <span className={`text-xs font-black px-2 py-0.5 rounded border font-mono ${badgeColor}`}>
            {normalizedScore}
          </span>
        </div>

        {statusText && (
          <p className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider mt-1">
            {statusText}
          </p>
        )}

        {explanation && (
          <p className="text-[11px] text-[#A1A1AA] mt-2 line-clamp-3 leading-relaxed">
            {explanation}
          </p>
        )}
      </div>

      {recommendation && (
        <div className="pt-2 border-t border-[#303038]/60">
          <p className="text-[10px] text-[#FF7417] font-medium line-clamp-2">
            💡 {recommendation}
          </p>
        </div>
      )}
    </div>
  );
};

export default ScoreCard;
