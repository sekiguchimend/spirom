import type { HTMLAttributes, ReactNode } from 'react';

interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  count?: number;
  children?: ReactNode;
}

export function Badge({ count, className = '', children, ...props }: BadgeProps) {
  const displayValue: ReactNode = count !== undefined ? (count > 99 ? '99+' : count) : children;

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[1.5rem] h-6 px-1.5
        text-xs font-black
        bg-accent text-white
        border-2 border-black
        rounded-full
        shadow-[2px_2px_0_#000000]
        ${className}
      `}
      {...props}
    >
      {displayValue}
    </span>
  );
}
