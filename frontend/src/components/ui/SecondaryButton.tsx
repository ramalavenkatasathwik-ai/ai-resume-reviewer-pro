import React from 'react';

export interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  icon,
  children,
  size = 'md',
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-xs',
    lg: 'px-6 py-3.5 text-sm',
  }[size];

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-[#F7F7FA] bg-[#1C1C23] hover:bg-[#24242E] border border-[#303038] hover:border-[#FF7417]/50 active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7417] disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export default SecondaryButton;
