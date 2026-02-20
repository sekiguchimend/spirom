'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { locales, localeNames, type Locale, defaultLocale } from '@/lib/i18n/config';
import { switchLocale, extractLocaleFromPath } from '@/lib/i18n';
import 'flag-icons/css/flag-icons.min.css';

interface LanguageSwitcherProps {
  className?: string;
}

// 言語コード → 国コードのマッピング
const localeToCountry: Record<Locale, string> = {
  ja: 'jp',
  en: 'us',
  zh: 'cn',
  ko: 'kr',
};

/**
 * ヘッダー用言語切り替えドロップダウン
 */
export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? '/';
  const router = useRouter();

  const currentLocale: Locale = extractLocaleFromPath(pathname) ?? defaultLocale;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = (locale: Locale) => {
    if (locale === currentLocale) {
      setIsOpen(false);
      return;
    }
    const newPath = switchLocale(pathname, locale);
    router.push(newPath);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 md:h-14 px-3 bg-black text-brand-cream flex items-center gap-2 rounded hover:bg-gray-900 transition-colors duration-200"
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={`fi fi-${localeToCountry[currentLocale]} rounded-sm`} style={{ fontSize: '1.25rem' }} />
        <span className="text-xs font-black uppercase">{currentLocale}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-2xl min-w-[180px] overflow-hidden z-50 border border-gray-200">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => handleSwitch(locale)}
              className={`w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 transition-colors duration-150 ${
                locale === currentLocale
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              <span className={`fi fi-${localeToCountry[locale]} rounded-sm`} style={{ fontSize: '1.25rem' }} />
              <span>{localeNames[locale]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * メニュー内用
 */
export function LanguageSwitcherMenu({ className = '' }: LanguageSwitcherProps) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const currentLocale: Locale = extractLocaleFromPath(pathname) ?? defaultLocale;

  const handleSwitch = (locale: Locale) => {
    if (locale === currentLocale) return;
    const newPath = switchLocale(pathname, locale);
    router.push(newPath);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => handleSwitch(locale)}
          className={`text-xl flex items-center gap-3 transition-colors duration-200 ${
            locale === currentLocale ? 'text-white' : 'text-white/50 hover:text-white/80'
          }`}
          style={{ fontWeight: 900 }}
        >
          <span className={`fi fi-${localeToCountry[locale]} rounded-sm`} style={{ fontSize: '1.5rem' }} />
          <span>{localeNames[locale]}</span>
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
