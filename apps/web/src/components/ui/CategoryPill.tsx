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
      className={`inline-flex items-center justify-center px-6 py-2.5 text-sm font-black uppercase tracking-wider border-3 border-black rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-[transform,box-shadow] duration-200 ${
        isActive
          ? 'bg-black text-white'
          : 'bg-white text-black hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
