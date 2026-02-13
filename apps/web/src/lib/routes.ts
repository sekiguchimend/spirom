/**
 * アプリケーションのルートパス定数
 * 全てのページパスを一元管理
 */

export const ROUTES = {
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
  SEARCH: '/search',
} as const;

/**
 * チェックアウト完了URLを生成
 */
export function getCheckoutCompleteUrl(orderId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${ROUTES.CHECKOUT.COMPLETE}?order_id=${orderId}`;
  }
  return `${ROUTES.CHECKOUT.COMPLETE}?order_id=${orderId}`;
}
