import { HTMLAttributes, forwardRef } from 'react';

type CardVariant = 'default' | 'interactive';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    const baseStyles = `
      bg-surface
      border-3 border-black
      rounded-2xl
      shadow-[4px_4px_0_#000000]
    `;

    const interactiveStyles = variant === 'interactive'
      ? `hover:shadow-[6px_6px_0_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-150 cursor-pointer`
      : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${interactiveStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
