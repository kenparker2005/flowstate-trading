import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: boolean;
}

export function Card({ accent, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-[#141418] border ${accent ? 'border-[#2962FF]' : 'border-[#1E1E26]'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
