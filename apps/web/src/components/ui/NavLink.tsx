import Link from 'next/link';
import { AnchorHTMLAttributes } from 'react';

type NavLinkVariant = 'header' | 'footer' | 'pill';

interface NavLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  variant?: NavLinkVariant;
  isActive?: boolean;
}

const variantStyles: Record<NavLinkVariant, string> = {
  header: 'text-text-primary font-semibold hover:text-accent transition-colors',
  footer: 'text-text-muted hover:text-text-secondary transition-colors',
  pill: 'px-4 py-2 rounded-full font-bold text-sm transition-all duration-150',
};

export function NavLink({ href, variant = 'header', isActive, className = '', children, ...props }: NavLinkProps) {
  const activeStyles = isActive ? 'text-accent' : '';

  return (
    <Link
      href={href}
      className={`${variantStyles[variant]} ${activeStyles} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
