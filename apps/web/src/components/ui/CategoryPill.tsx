import Link from 'next/link';

interface CategoryPillProps {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}

export function CategoryPill({ href, children, isActive = false }: CategoryPillProps) {
  return (
    <Link
      href={href}
      className={`relative inline-flex items-center justify-center px-5 py-2 text-base font-black uppercase tracking-wider transition-colors duration-200 after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:w-[2px] after:h-4 after:bg-black ${
        isActive
          ? 'text-black'
          : 'text-gray-400 hover:text-black'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
