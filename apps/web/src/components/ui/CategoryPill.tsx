import Link from 'next/link';

interface CategoryPillProps {
  href: string;
  children: React.ReactNode;
}

export function CategoryPill({ href, children }: CategoryPillProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-black uppercase tracking-wider text-black bg-white border-3 border-black rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
    >
      {children}
    </Link>
  );
}
