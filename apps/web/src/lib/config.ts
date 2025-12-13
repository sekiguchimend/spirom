/**
 * アプリケーション設定
 * URL、定数値を一元管理
 */

// ============================================
// サイト設定
// ============================================

/** サイトURL */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://spirom.com';

/** サイト名 */
export const SITE_NAME = 'Spirom';

// ============================================
// API URLs
// ============================================

/** BFF URL (サーバーサイド: BFF_URL, クライアントサイド: NEXT_PUBLIC_BFF_URL) */
export const BFF_BASE_URL = process.env.BFF_URL || process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:8787';

// ============================================
// Cookie 設定
// ============================================

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'spirom_auth_token',
  REFRESH_TOKEN: 'spirom_refresh_token',
  SESSION_STARTED_AT: 'spirom_session_started_at',
} as const;

// ============================================
// 時間定数（秒）
// ============================================

/** RefreshトークンのCookie保持期間（30日） */
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** リフレッシュで保持したい最大セッション（1日） */
export const MAX_SESSION_SECONDS = 60 * 60 * 24;

/** セッションリフレッシュ間隔（10分、ミリ秒） */
export const SESSION_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

// ============================================
// UI定数
// ============================================

/** カート追加後のアニメーション時間（ミリ秒） */
export const CART_ANIMATION_DELAY_MS = 300;

/** 成功メッセージ表示時間（ミリ秒） */
export const SUCCESS_MESSAGE_DURATION_MS = 2000;

// ============================================
// Sanity設定
// ============================================

/** Sanity API バージョン */
export const SANITY_API_VERSION = '2024-01-01';

/** 日本語読了速度（文字/分） */
export const READING_SPEED_CHARS_PER_MIN = 400;

// ============================================
// カート
// ============================================

export const CART_STORAGE_KEY = 'spirom-cart';
