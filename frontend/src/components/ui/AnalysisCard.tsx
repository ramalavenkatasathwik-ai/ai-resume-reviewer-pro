import React from 'react';

interface AnalysisCardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({
  title,
  subtitle,
  icon,
  headerAction,
  children,
  className = '',
}) => {
  return (
    <div
      className={`bg-[#141419] rounded-2xl border border-[#303038] shadow-card-subtle p-5 sm:p-6 transition-all duration-200 hover:border-[#303038]/80 ${className}`}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#303038]/60 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            {icon && <div className="text-[#FF7417] shrink-0">{icon}</div>}
            <div>
              {title && <h3 className="text-sm font-bold text-[#F7F7FA] tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-[#A1A1AA] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

export default AnalysisCard;
