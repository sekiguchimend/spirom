'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { SITE_URL } from '@/lib/config';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const pathname = usePathname();
  const locale = (pathname?.split('/')[1] as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);
  // BreadcrumbList 構造化データを生成
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.href ? `${SITE_URL}${item.href}` : undefined,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
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
                    href={item.href || routes.HOME}
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
    </>
  );
}
