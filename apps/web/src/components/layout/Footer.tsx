'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { extractLocaleFromPath } from '@/lib/i18n';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';

export default function Footer() {
  const pathname = usePathname() ?? '/';
  const locale: Locale = extractLocaleFromPath(pathname) ?? defaultLocale;
  const routes = createLocalizedRoutes(locale);

  // フッターのテキスト（シンプルな翻訳）
  const t = {
    legal: locale === 'ja' ? '特商法表記' : 'Legal Notice',
  };

  return (
    <footer className="bg-black text-white py-16" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
          <nav aria-labelledby="footer-shop">
            <h2 id="footer-shop" className="font-bold text-sm uppercase tracking-widest mb-6 text-gray-400">Shop</h2>
            <ul className="space-y-4">
              <li><Link href={routes.PRODUCTS.INDEX} className="text-sm font-bold hover:text-gray-300 transition-colors">Products</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-support">
            <h2 id="footer-support" className="font-bold text-sm uppercase tracking-widest mb-6 text-gray-400">Support</h2>
            <ul className="space-y-4">
              <li><Link href={routes.FAQ} className="text-sm font-bold hover:text-gray-300 transition-colors">FAQ</Link></li>
              <li><Link href={routes.CONTACT} className="text-sm font-bold hover:text-gray-300 transition-colors">Contact</Link></li>
              <li><Link href={routes.ACCOUNT.NEW_ADDRESS} className="text-sm font-bold hover:text-gray-300 transition-colors">Address</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-company">
            <h2 id="footer-company" className="font-bold text-sm uppercase tracking-widest mb-6 text-gray-400">Company</h2>
            <ul className="space-y-4">
              <li><Link href={routes.ABOUT} className="text-sm font-bold hover:text-gray-300 transition-colors">About</Link></li>
              <li><Link href={routes.BLOG.INDEX} className="text-sm font-bold hover:text-gray-300 transition-colors">Blog</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="font-bold text-sm uppercase tracking-widest mb-6 text-gray-400">Legal</h2>
            <ul className="space-y-4">
              <li><Link href={routes.PRIVACY} className="text-sm font-bold hover:text-gray-300 transition-colors">Privacy</Link></li>
              <li><Link href={routes.TERMS} className="text-sm font-bold hover:text-gray-300 transition-colors">Terms</Link></li>
              <li><Link href={routes.LEGAL} className="text-sm font-bold hover:text-gray-300 transition-colors">{t.legal}</Link></li>
            </ul>
          </nav>
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href={routes.HOME} className="text-2xl font-black tracking-tighter">SPIROM</Link>
          <p className="text-gray-500 text-xs uppercase tracking-wide">&copy; {new Date().getFullYear()} SPIROM INC.</p>
        </div>
      </div>
    </footer>
  );
}
