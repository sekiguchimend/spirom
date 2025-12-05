import { forwardRef, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white border-black hover:bg-accent-hover',
  secondary: 'bg-surface text-text-primary border-black hover:bg-surface-hover',
  ghost: 'bg-transparent text-text-secondary border-transparent shadow-none hover:bg-surface-hover hover:text-text-primary',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const isGhost = variant === 'ghost';

    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2
          font-bold rounded-xl
          border-3
          ${!isGhost ? 'shadow-[3px_3px_0_#000000] hover:shadow-[4px_4px_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0_#000000] active:translate-x-[2px] active:translate-y-[2px]' : ''}
          transition-all duration-100
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
