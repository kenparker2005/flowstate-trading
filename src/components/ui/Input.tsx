import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-mono text-[#787B86] mb-1 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={`input-field w-full ${error ? 'border-[#EF5350]' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[#EF5350] font-mono">{error}</p>}
    </div>
  );
}
