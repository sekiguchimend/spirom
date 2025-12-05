import { forwardRef, ButtonHTMLAttributes } from 'react';

type IconButtonVariant = 'default' | 'ghost';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  'aria-label': string;
}

const variantStyles: Record<IconButtonVariant, string> = {
  default: 'bg-surface text-text-primary border-black shadow-[3px_3px_0_#000000] hover:shadow-[4px_4px_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px]',
  ghost: 'bg-transparent text-text-secondary border-transparent hover:bg-surface-hover hover:text-text-primary',
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'default', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          rounded-xl border-2
          transition-all duration-100
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

IconButton.displayName = 'IconButton';
