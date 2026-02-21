'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getCartCount } from '@/lib/cart';
import { useAuth } from '@/contexts/AuthContext';
import { extractLocaleFromPath } from '@/lib/i18n';
import { createLocalizedRoutes } from '@/lib/routes';
import { LanguageSwitcher, LanguageSwitcherMenu } from '@/components/i18n/LanguageSwitcher';
import { type Locale, defaultLocale } from '@/lib/i18n/config';

export default function Header() {
  const { user, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname() ?? '/';

  // 現在の言語を取得
  const locale: Locale = extractLocaleFromPath(pathname) ?? defaultLocale;
  const routes = createLocalizedRoutes(locale);

  useEffect(() => {
    setCartCount(getCartCount());

    const handleCartUpdate = () => {
      setCartCount(getCartCount());
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  return (
    <>
      <header className="absolute top-0 left-0 w-full z-50 p-3 md:p-4 flex justify-between items-start mix-blend-normal pointer-events-none">
        {/* 左上: ロゴ */}
        <Link href={routes.HOME} className="block relative w-20 h-20 md:w-28 md:h-28 pointer-events-auto" aria-label="Spirom Home">
          <Image
            src="/spirom.png"
            alt="Spirom Logo"
            fill
            sizes="(min-width: 768px) 112px, 80px"
            className="object-contain"
            priority
          />
        </Link>

        {/* 中央上: 通知バー（PCのみ表示） */}
        <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-4 pointer-events-auto">
          <Link
            href={routes.ABOUT}
            className="inline-flex text-black items-center gap-2 bg-brand-cream/90 backdrop-blur px-4 py-2 rounded text-xs font-bold uppercase tracking-widest border border-black/10 hover:bg-white transition-colors"
          >
            We rebranded with purpose. Read the story
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* 右上: 言語切替 + 認証アイコン + カートアイコン + ハンバーガーメニュー */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* 言語切り替え */}
          <LanguageSwitcher />

          {/* 認証状態に応じたアイコン */}
          {!isLoading && (
            <>
              {user ? (
                <Link
                  href={routes.ACCOUNT.INDEX}
                  className="w-12 h-12 md:w-14 md:h-14 bg-black text-brand-cream flex items-center justify-center rounded hover:bg-gray-900 transition-colors duration-200"
                  aria-label={locale === 'ja' ? 'アカウント' : 'Account'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </Link>
              ) : (
                <Link
                  href={routes.AUTH.REGISTER}
                  className="w-12 h-12 md:w-14 md:h-14 bg-black text-brand-cream flex items-center justify-center rounded hover:bg-gray-900 transition-colors duration-200 relative group"
                  aria-label={locale === 'ja' ? '新規登録・ログイン' : 'Sign Up / Login'}
                  title={locale === 'ja' ? '新規登録・ログイン' : 'Sign Up / Login'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                  </svg>
                  <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {locale === 'ja' ? '登録・ログイン' : 'Sign Up / Login'}
                  </span>
                </Link>
              )}
            </>
          )}

          {/* カートアイコン */}
          <Link
            href={routes.CART}
            className="relative w-12 h-12 md:w-14 md:h-14 bg-black text-brand-cream flex items-center justify-center rounded hover:bg-gray-900 transition-colors duration-200"
            aria-label={locale === 'ja' ? 'カートを見る' : 'View Cart'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-green text-white text-xs font-bold rounded-full flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          {/* ハンバーガーメニュー */}
          <button
            type="button"
            className="w-12 h-12 md:w-14 md:h-14 bg-black text-brand-cream flex flex-col items-center justify-center gap-1.5 rounded hover:bg-gray-900 transition-colors duration-200 flex-shrink-0"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
          >
            <span className="w-6 h-0.5 bg-current block"></span>
            <span className="w-6 h-0.5 bg-current block"></span>
          </button>
        </div>
      </header>

      {/* メニューオーバーレイ */}
      {isMenuOpen && (
        <>
          <div
            className="hidden md:block fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMenuOpen(false)}
          />

          <div className={`
            fixed z-[100] bg-black text-white flex flex-col
            inset-0
            md:inset-auto md:top-0 md:right-0 md:bottom-0 md:w-auto md:min-w-[280px]
            md:shadow-2xl md:animate-slide-in-right
          `}>
            <div className="p-6 md:p-8 flex justify-end">
              <button
                type="button"
                className="w-12 h-12 flex items-center justify-center text-white hover:text-white/70 transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="4">
                  <path d="M8 8l16 16M8 24L24 8"/>
                </svg>
              </button>
            </div>

            <nav className="flex-1 flex flex-col justify-center items-center md:items-start md:px-10">
              <ul className="space-y-5 text-center md:text-left" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
                <li><Link href={routes.HOME} className="block text-4xl md:text-4xl uppercase tracking-tight hover:text-white/60 transition-colors duration-200" style={{ fontWeight: 900 }} onClick={() => setIsMenuOpen(false)}>Home</Link></li>
                <li><Link href={routes.PRODUCTS.INDEX} className="block text-4xl md:text-4xl uppercase tracking-tight hover:text-white/60 transition-colors duration-200" style={{ fontWeight: 900 }} onClick={() => setIsMenuOpen(false)}>Shop</Link></li>
                <li><Link href={routes.BLOG.INDEX} className="block text-4xl md:text-4xl uppercase tracking-tight hover:text-white/60 transition-colors duration-200" style={{ fontWeight: 900 }} onClick={() => setIsMenuOpen(false)}>Blog</Link></li>
                <li><Link href={routes.ABOUT} className="block text-4xl md:text-4xl uppercase tracking-tight hover:text-white/60 transition-colors duration-200" style={{ fontWeight: 900 }} onClick={() => setIsMenuOpen(false)}>About</Link></li>
                <li><Link href={routes.ACCOUNT.ADDRESSES} className="block text-2xl md:text-2xl uppercase tracking-tight hover:text-white/60 transition-colors duration-200" style={{ fontWeight: 900 }} onClick={() => setIsMenuOpen(false)}>Address</Link></li>
                <li className="pt-4 border-t border-white/20">
                  <LanguageSwitcherMenu />
                </li>
              </ul>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
