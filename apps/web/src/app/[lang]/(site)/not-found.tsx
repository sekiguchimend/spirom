'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';

export default function NotFound() {
  const pathname = usePathname();
  const locale = (pathname?.split('/')[1] as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-black mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">ページが見つかりませんでした</p>
      <Link
        href={routes.HOME}
        className="bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition-colors"
      >
        トップページへ戻る
      </Link>
    </div>
  );
}
