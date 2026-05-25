import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const base = 'font-mono font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-[#2962FF] text-white hover:bg-[#1a4fd8]',
    secondary: 'bg-[#141418] border border-[#1E1E26] text-[#D1D4DC] hover:border-[#787B86]',
    ghost: 'text-[#787B86] hover:text-[#D1D4DC]',
    danger: 'bg-[#EF5350] text-white hover:bg-[#d43533]',
  };

  const sizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
