import React from 'react';

interface EmptyStateProps {
  icon?: React.ElementType | React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  const renderIcon = () => {
    if (!icon) return null;
    if (
      typeof icon === 'function' ||
      (typeof icon === 'object' && icon !== null && 'render' in (icon as any))
    ) {
      const IconComponent = icon as React.ElementType;
      return <IconComponent className="w-6 h-6" />;
    }
    return icon as React.ReactNode;
  };

  return (
    <div className="text-center py-12 px-4 rounded-2xl bg-[#141419] border border-[#303038] space-y-4">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[#1C1C23] border border-[#303038] text-[#FF7417] flex items-center justify-center mx-auto">
          {renderIcon()}
        </div>
      )}
      <div className="max-w-md mx-auto space-y-1">
        <h4 className="text-sm font-bold text-[#F7F7FA]">{title}</h4>
        <p className="text-xs text-[#A1A1AA] leading-relaxed">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
