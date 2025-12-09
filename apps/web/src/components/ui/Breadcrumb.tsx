import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="mb-4 sm:mb-6" aria-label="パンくずリスト">
      <ol className="flex flex-wrap items-center gap-1 text-xs sm:text-sm text-gray-400">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center font-bold">
              {index > 0 && <span className="mx-1.5 font-bold">/</span>}

              {isLast ? (
                <span className="font-bold truncate max-w-[150px] sm:max-w-[300px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href || '/'}
                  className="font-bold hover:text-gray-600 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
