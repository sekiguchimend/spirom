import { HTMLAttributes } from 'react';

type TagVariant = 'new' | 'sale' | 'hot' | 'default';

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
}

const variantStyles: Record<TagVariant, string> = {
  new: 'bg-lime text-black',
  sale: 'bg-tag-sale text-white',
  hot: 'bg-orange text-black',
  default: 'bg-surface-elevated text-text-secondary',
};

export function Tag({ variant = 'default', className = '', children, ...props }: TagProps) {
  return (
    <span
      className={`
        inline-block px-3 py-1
        text-xs font-black uppercase tracking-wide
        border-2 border-black
        rounded-lg
        shadow-[2px_2px_0_#000000]
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}
