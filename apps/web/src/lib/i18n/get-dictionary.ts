/**
 * Dictionary Loader
 * ページ単位で翻訳JSONをダイナミックインポート
 */

import { type Locale, type DictionaryPage, defaultLocale, isValidLocale } from './config';

// 辞書のキャッシュ（サーバーサイドで有効）
const dictionaryCache = new Map<string, Record<string, unknown>>();

/**
 * 指定したページの辞書を取得
 * Server Componentで使用
 */
export async function getDictionary(
  locale: Locale,
  page: DictionaryPage
): Promise<Record<string, unknown>> {
  const cacheKey = `${locale}:${page}`;

  // キャッシュチェック
  if (dictionaryCache.has(cacheKey)) {
    return dictionaryCache.get(cacheKey)!;
  }

  try {
    // ダイナミックインポート
    const dictionary = await import(`@/locales/${locale}/${page}.json`)
      .then((module) => module.default);

    dictionaryCache.set(cacheKey, dictionary);
    return dictionary;
  } catch {
    // フォールバック: デフォルト言語の辞書を返す
    if (locale !== defaultLocale) {
      console.warn(`Dictionary not found: ${locale}/${page}, falling back to ${defaultLocale}`);
      return getDictionary(defaultLocale, page);
    }
    // デフォルト言語でも見つからない場合は空オブジェクト
    console.error(`Dictionary not found: ${locale}/${page}`);
    return {};
  }
}

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
