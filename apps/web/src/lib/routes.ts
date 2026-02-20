/**
 * アプリケーションのルートパス定数
 * 全てのページパスを一元管理
 */

import { type Locale, defaultLocale } from '@/lib/i18n/config';

// ベースパス（言語プレフィックスなし）
const BASE_ROUTES = {
  // ホーム
  HOME: '/',

  // 認証
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
  },

  // アカウント
  ACCOUNT: {
    INDEX: '/account',
    ADDRESSES: '/account/addresses',
    NEW_ADDRESS: '/account/addresses/new',
    EDIT_ADDRESS: (id: string) => `/account/addresses/${id}/edit`,
  },

  // 商品
  PRODUCTS: {
    INDEX: '/products',
    DETAIL: (slug: string) => `/products/${slug}`,
  },

  // カテゴリー
  CATEGORIES: {
    INDEX: '/categories',
    DETAIL: (slug: string) => `/categories/${slug}`,
  },

  // カート・チェックアウト
  CART: '/cart',
  CHECKOUT: {
    INDEX: '/checkout',
    COMPLETE: '/checkout/complete',
    COMPLETE_WITH_ORDER: (orderId: string) => `/checkout/complete?order_id=${orderId}`,
  },

  // 注文
  ORDERS: {
    INDEX: '/orders',
    DETAIL: (id: string) => `/orders/${id}`,
    GUEST_DETAIL: (id: string) => `/orders/guest/${id}`,
  },

  // ブログ
  BLOG: {
    INDEX: '/blog',
    DETAIL: (slug: string) => `/blog/${slug}`,
  },

  // 静的ページ
  ABOUT: '/about',
  CONTACT: '/contact',
  FAQ: '/faq',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  LEGAL: '/legal',
  SEARCH: '/search',
} as const;

// 後方互換性のためにエクスポート
export const ROUTES = BASE_ROUTES;

/**
 * パスに言語プレフィックスを追加
 */
export function localePath(path: string, locale: Locale): string {
  if (path === '/') {
    return `/${locale}`;
  }
  return `/${locale}${path}`;
}

/**
 * 言語対応のルートヘルパー
 */
export function createLocalizedRoutes(locale: Locale) {
  const lp = (path: string) => localePath(path, locale);

  return {
    HOME: lp('/'),
    AUTH: {
      LOGIN: lp('/login'),
      REGISTER: lp('/register'),
    },
    ACCOUNT: {
      INDEX: lp('/account'),
      ADDRESSES: lp('/account/addresses'),
      NEW_ADDRESS: lp('/account/addresses/new'),
      EDIT_ADDRESS: (id: string) => lp(`/account/addresses/${id}/edit`),
    },
    PRODUCTS: {
      INDEX: lp('/products'),
      DETAIL: (slug: string) => lp(`/products/${slug}`),
    },
    CATEGORIES: {
      INDEX: lp('/categories'),
      DETAIL: (slug: string) => lp(`/categories/${slug}`),
    },
    CART: lp('/cart'),
    CHECKOUT: {
      INDEX: lp('/checkout'),
      COMPLETE: lp('/checkout/complete'),
      COMPLETE_WITH_ORDER: (orderId: string) => lp(`/checkout/complete?order_id=${orderId}`),
    },
    ORDERS: {
      INDEX: lp('/orders'),
      DETAIL: (id: string) => lp(`/orders/${id}`),
      GUEST_DETAIL: (id: string) => lp(`/orders/guest/${id}`),
    },
    BLOG: {
      INDEX: lp('/blog'),
      DETAIL: (slug: string) => lp(`/blog/${slug}`),
    },
    ABOUT: lp('/about'),
    CONTACT: lp('/contact'),
    FAQ: lp('/faq'),
    TERMS: lp('/terms'),
    PRIVACY: lp('/privacy'),
    LEGAL: lp('/legal'),
    SEARCH: lp('/search'),
  } as const;
}

/**
 * チェックアウト完了URLを生成
 */
export function getCheckoutCompleteUrl(orderId: string, locale?: Locale): string {
  const path = `/checkout/complete?order_id=${orderId}`;
  const localizedPath = locale ? localePath(path.split('?')[0], locale) + `?order_id=${orderId}` : path;

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${localizedPath}`;
  }
  return localizedPath;
}

/**
 * 現在のパスから言語を切り替えた新しいパスを生成
 */
export function switchLocale(currentPath: string, newLocale: Locale): string {
  // /ja/products → /en/products
  const pathWithoutLocale = currentPath.replace(/^\/[a-z]{2}(?=\/|$)/, '');
  return localePath(pathWithoutLocale || '/', newLocale);
}
