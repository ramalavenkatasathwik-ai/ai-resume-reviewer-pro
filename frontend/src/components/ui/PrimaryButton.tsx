import React from 'react';

export interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'crimson' | 'orange';
  size?: 'sm' | 'md' | 'lg';
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  isLoading = false,
  icon,
  children,
  variant = 'crimson',
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

  const variantClasses =
    variant === 'orange'
      ? 'bg-[#FF7417] text-[#0B0B0E] font-extrabold hover:bg-[#FF9B45] hover:shadow-[0_0_20px_rgba(255,116,23,0.4)] disabled:hover:bg-[#FF7417]'
      : 'bg-[#C91432] text-white font-bold hover:bg-[#F04452] hover:shadow-[0_0_20px_rgba(201,20,50,0.4)] disabled:hover:bg-[#C91432]';

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7417] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default PrimaryButton;
