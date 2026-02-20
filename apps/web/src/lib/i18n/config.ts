/**
 * i18n Configuration
 * 多言語対応の設定ファイル
 */

// 対応言語の定義
export const locales = ['ja', 'en', 'zh', 'ko'] as const;
export type Locale = (typeof locales)[number];

// デフォルト言語
export const defaultLocale: Locale = 'ja';

// 言語表示名
export const localeNames: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
  zh: '中文',
  ko: '한국어',
};

// 言語に対応する国旗
export const localeFlags: Record<Locale, string> = {
  ja: '🇯🇵',
  en: '🇺🇸',
  zh: '🇨🇳',
  ko: '🇰🇷',
};

// 国コード → 言語のマッピング
export const countryToLocale: Record<string, Locale> = {
  // 日本語
  JP: 'ja',
  // 英語圏
  US: 'en',
  GB: 'en',
  AU: 'en',
  CA: 'en',
  NZ: 'en',
  IE: 'en',
  SG: 'en',
  PH: 'en',
  IN: 'en',
  // 中国語
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  MO: 'zh',
  // 韓国語
  KR: 'ko',
};

// 言語が有効かチェック
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

// 国コードから言語を取得
export function getLocaleFromCountry(countryCode: string | null): Locale {
  if (!countryCode) return defaultLocale;
  return countryToLocale[countryCode.toUpperCase()] ?? defaultLocale;
}

// ページで使用する辞書の種類
export const dictionaryPages = [
  'common',
  'home',
  'products',
  'cart',
  'checkout',
  'auth',
  'account',
  'orders',
  'contact',
  'faq',
  'legal',
  'blog',
  'errors',
] as const;

export type DictionaryPage = (typeof dictionaryPages)[number];
