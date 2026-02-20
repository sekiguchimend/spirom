/**
 * Dictionary Loader
 * ページ単位で翻訳JSONをダイナミックインポート
 */

import { cache } from 'react';
import { type Locale, type DictionaryPage, defaultLocale, isValidLocale } from './config';

// 静的インポートで全辞書を事前読み込み（ビルド時に最適化される）
const dictionaries: Record<Locale, Record<DictionaryPage, () => Promise<Record<string, unknown>>>> = {
  ja: {
    common: () => import('@/locales/ja/common.json').then(m => m.default),
    home: () => import('@/locales/ja/home.json').then(m => m.default),
    products: () => import('@/locales/ja/products.json').then(m => m.default),
    cart: () => import('@/locales/ja/cart.json').then(m => m.default),
    checkout: () => import('@/locales/ja/checkout.json').then(m => m.default),
    auth: () => import('@/locales/ja/auth.json').then(m => m.default),
    account: () => import('@/locales/ja/account.json').then(m => m.default),
    orders: () => import('@/locales/ja/orders.json').then(m => m.default),
    contact: () => import('@/locales/ja/contact.json').then(m => m.default),
    faq: () => import('@/locales/ja/faq.json').then(m => m.default),
    legal: () => import('@/locales/ja/legal.json').then(m => m.default),
    privacy: () => import('@/locales/ja/privacy.json').then(m => m.default),
    terms: () => import('@/locales/ja/terms.json').then(m => m.default),
    about: () => import('@/locales/ja/about.json').then(m => m.default),
    blog: () => import('@/locales/ja/blog.json').then(m => m.default),
    errors: () => import('@/locales/ja/errors.json').then(m => m.default),
  },
  en: {
    common: () => import('@/locales/en/common.json').then(m => m.default),
    home: () => import('@/locales/en/home.json').then(m => m.default),
    products: () => import('@/locales/en/products.json').then(m => m.default),
    cart: () => import('@/locales/en/cart.json').then(m => m.default),
    checkout: () => import('@/locales/en/checkout.json').then(m => m.default),
    auth: () => import('@/locales/en/auth.json').then(m => m.default),
    account: () => import('@/locales/en/account.json').then(m => m.default),
    orders: () => import('@/locales/en/orders.json').then(m => m.default),
    contact: () => import('@/locales/en/contact.json').then(m => m.default),
    faq: () => import('@/locales/en/faq.json').then(m => m.default),
    legal: () => import('@/locales/en/legal.json').then(m => m.default),
    privacy: () => import('@/locales/en/privacy.json').then(m => m.default),
    terms: () => import('@/locales/en/terms.json').then(m => m.default),
    about: () => import('@/locales/en/about.json').then(m => m.default),
    blog: () => import('@/locales/en/blog.json').then(m => m.default),
    errors: () => import('@/locales/en/errors.json').then(m => m.default),
  },
  zh: {
    common: () => import('@/locales/zh/common.json').then(m => m.default),
    home: () => import('@/locales/zh/home.json').then(m => m.default),
    products: () => import('@/locales/zh/products.json').then(m => m.default),
    cart: () => import('@/locales/zh/cart.json').then(m => m.default),
    checkout: () => import('@/locales/ja/checkout.json').then(m => m.default), // fallback
    auth: () => import('@/locales/zh/auth.json').then(m => m.default),
    account: () => import('@/locales/zh/account.json').then(m => m.default),
    orders: () => import('@/locales/ja/orders.json').then(m => m.default), // fallback
    contact: () => import('@/locales/zh/contact.json').then(m => m.default),
    faq: () => import('@/locales/zh/faq.json').then(m => m.default),
    legal: () => import('@/locales/zh/legal.json').then(m => m.default),
    privacy: () => import('@/locales/zh/privacy.json').then(m => m.default),
    terms: () => import('@/locales/zh/terms.json').then(m => m.default),
    about: () => import('@/locales/zh/about.json').then(m => m.default),
    blog: () => import('@/locales/zh/blog.json').then(m => m.default),
    errors: () => import('@/locales/ja/errors.json').then(m => m.default), // fallback
  },
  ko: {
    common: () => import('@/locales/ko/common.json').then(m => m.default),
    home: () => import('@/locales/ko/home.json').then(m => m.default),
    products: () => import('@/locales/ko/products.json').then(m => m.default),
    cart: () => import('@/locales/ko/cart.json').then(m => m.default),
    checkout: () => import('@/locales/ja/checkout.json').then(m => m.default), // fallback
    auth: () => import('@/locales/ko/auth.json').then(m => m.default),
    account: () => import('@/locales/ko/account.json').then(m => m.default),
    orders: () => import('@/locales/ja/orders.json').then(m => m.default), // fallback
    contact: () => import('@/locales/ko/contact.json').then(m => m.default),
    faq: () => import('@/locales/ko/faq.json').then(m => m.default),
    legal: () => import('@/locales/ko/legal.json').then(m => m.default),
    privacy: () => import('@/locales/ko/privacy.json').then(m => m.default),
    terms: () => import('@/locales/ko/terms.json').then(m => m.default),
    about: () => import('@/locales/ko/about.json').then(m => m.default),
    blog: () => import('@/locales/ko/blog.json').then(m => m.default),
    errors: () => import('@/locales/ja/errors.json').then(m => m.default), // fallback
  },
};

/**
 * 指定したページの辞書を取得（リクエスト単位でキャッシュ）
 * Server Componentで使用
 */
export const getDictionary = cache(async (
  locale: Locale,
  page: DictionaryPage
): Promise<Record<string, unknown>> => {
  try {
    const loader = dictionaries[locale]?.[page];
    if (loader) {
      return await loader();
    }
    // フォールバック
    return await dictionaries[defaultLocale][page]();
  } catch {
    console.error(`Dictionary not found: ${locale}/${page}`);
    return {};
  }
});

/**
 * 複数ページの辞書を一括取得
 * レイアウトで共通辞書 + ページ固有辞書を取得する際に使用
 */
export async function getDictionaries(
  locale: Locale,
  pages: DictionaryPage[]
): Promise<Record<DictionaryPage, Record<string, unknown>>> {
  const results = await Promise.all(
    pages.map(async (page) => ({
      page,
      dict: await getDictionary(locale, page),
    }))
  );

  return results.reduce(
    (acc, { page, dict }) => {
      acc[page] = dict;
      return acc;
    },
    {} as Record<DictionaryPage, Record<string, unknown>>
  );
}

/**
 * パスから言語を抽出
 * /ja/products → 'ja'
 * /en/cart → 'en'
 * /products → null
 */
export function extractLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && isValidLocale(firstSegment)) {
    return firstSegment;
  }

  return null;
}

/**
 * パスから言語プレフィックスを除去
 * /ja/products → /products
 * /en/cart/checkout → /cart/checkout
 */
export function removeLocaleFromPath(pathname: string): string {
  const locale = extractLocaleFromPath(pathname);
  if (!locale) return pathname;

  const withoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
  return withoutLocale;
}

/**
 * パスに言語プレフィックスを追加
 * /products, 'ja' → /ja/products
 */
export function addLocaleToPath(pathname: string, locale: Locale): string {
  const cleanPath = removeLocaleFromPath(pathname);
  return `/${locale}${cleanPath === '/' ? '' : cleanPath}`;
}
