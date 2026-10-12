import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SectionAccordionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  count?: number;
  icon?: React.ElementType | React.ReactNode;
  defaultOpen?: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const SectionAccordion: React.FC<SectionAccordionProps> = ({
  title,
  subtitle,
  badge,
  count,
  icon,
  defaultOpen,
  defaultExpanded = true,
  children,
  className = '',
}) => {
  const initialOpen = defaultOpen !== undefined ? defaultOpen : defaultExpanded;
  const [isExpanded, setIsExpanded] = useState(initialOpen);

  const displayBadge = badge || (count !== undefined ? String(count) : undefined);

  const renderIcon = () => {
    if (!icon) return null;
    if (
      typeof icon === 'function' ||
      (typeof icon === 'object' && icon !== null && 'render' in (icon as unknown as Record<string, unknown>))
    ) {
      const IconComponent = icon as React.ElementType;
      return <IconComponent className="w-4 h-4" />;
    }
    return icon as React.ReactNode;
  };

  return (
    <div
      className={`bg-[#141419] rounded-2xl border border-[#303038] overflow-hidden transition-all duration-200 ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 sm:px-6 py-4 flex items-center justify-between text-left hover:bg-[#1C1C23] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7417]"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-[#FF7417]/10 text-[#FF7417] border border-[#FF7417]/30 flex items-center justify-center shrink-0">
              {renderIcon()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#F7F7FA]">{title}</h4>
              {displayBadge && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1C1C23] text-[#FF7417] border border-[#303038]">
                  {displayBadge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-[#A1A1AA] mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="text-[#A1A1AA]">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-5 sm:p-6 border-t border-[#303038] text-xs text-[#F7F7FA] space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default SectionAccordion;
