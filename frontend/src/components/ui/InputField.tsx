import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  icon?: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A1A1AA]">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full py-2.5 rounded-xl bg-[#0B0B0E] border text-sm text-[#F7F7FA] placeholder-[#71717A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7417] ${
            icon ? 'pl-10' : 'pl-3.5'
          } pr-3.5 ${
            error
              ? 'border-[#F04452] focus:border-[#F04452]'
              : 'border-[#303038] focus:border-[#FF7417]'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] font-semibold text-[#F04452] mt-1">{error}</p>}
      {!error && helperText && <p className="text-[11px] text-[#A1A1AA] mt-1">{helperText}</p>}
    </div>
  );
};

export default InputField;
