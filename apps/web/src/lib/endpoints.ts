/**
 * APIエンドポイントパス定数
 * 全てのAPIパスを一元管理
 */

export const API_ENDPOINTS = {
  // 認証
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
  },

  // ユーザー
  USERS: {
    ME: '/api/v1/users/me',
    ADDRESSES: '/api/v1/users/me/addresses',
  },

  // 注文
  ORDERS: {
    BASE: '/api/v1/orders',
    BY_ID: (id: string) => `/api/v1/orders/${id}`,
  },

  // 決済
  PAYMENTS: {
    INTENT: '/api/v1/payments/intent',
  },

  // 商品
  PRODUCTS: {
    BASE: '/api/v1/products',
    BY_SLUG: (slug: string) => `/api/v1/products/${slug}`,
  },

  // カテゴリー
  CATEGORIES: {
    BASE: '/api/v1/categories',
    BY_SLUG: (slug: string) => `/api/v1/categories/${slug}`,
  },

  // BFF
  BFF: {
    HOME: '/bff/v1/home',
    PRODUCT_DETAIL: (slug: string) => `/bff/v1/products/${slug}`,
    CATEGORY_PAGE: (slug: string) => `/bff/v1/categories/${slug}`,
    BLOG_DETAIL: (slug: string) => `/bff/v1/blog/${slug}`,
    SEARCH: '/bff/v1/search',
  },
} as const;
