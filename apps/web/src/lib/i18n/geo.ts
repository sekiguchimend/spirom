/**
 * Geo-based Language Detection
 * Vercel Edge Functionsのヘッダーから国を判定
 */

import { NextRequest } from 'next/server';
import { getLocaleFromCountry, type Locale } from './config';

// Vercel Edge Functionsが提供するヘッダー
const GEO_HEADERS = {
  COUNTRY: 'x-vercel-ip-country',
  REGION: 'x-vercel-ip-country-region',
  CITY: 'x-vercel-ip-city',
} as const;

export interface GeoInfo {
  country: string | null;
  region: string | null;
  city: string | null;
}

/**
 * リクエストから地理情報を取得
 */
export function getGeoInfo(request: NextRequest): GeoInfo {
  return {
    country: request.headers.get(GEO_HEADERS.COUNTRY),
    region: request.headers.get(GEO_HEADERS.REGION),
    city: request.headers.get(GEO_HEADERS.CITY),
  };
}

/**
 * リクエストから推奨言語を判定
 * 優先順位:
 * 1. URLパスの言語プレフィックス（既に処理済み）
 * 2. Vercelヘッダーの国コード
 * 3. デフォルト言語
 */
export function detectLocaleFromRequest(request: NextRequest): Locale {
  const geo = getGeoInfo(request);
  return getLocaleFromCountry(geo.country);
}

/**
 * 地域グループの定義（送料計算用）
 */
export type ShippingRegion = 'domestic' | 'asia' | 'north_america' | 'europe' | 'other';

const REGION_MAPPING: Record<string, ShippingRegion> = {
  // 国内
  JP: 'domestic',
  // アジア
  CN: 'asia',
  KR: 'asia',
  TW: 'asia',
  HK: 'asia',
  SG: 'asia',
  TH: 'asia',
  MY: 'asia',
  ID: 'asia',
  PH: 'asia',
  VN: 'asia',
  IN: 'asia',
  // 北米
  US: 'north_america',
  CA: 'north_america',
  MX: 'north_america',
  // ヨーロッパ
  GB: 'europe',
  DE: 'europe',
  FR: 'europe',
  IT: 'europe',
  ES: 'europe',
  NL: 'europe',
  BE: 'europe',
  AT: 'europe',
  CH: 'europe',
  SE: 'europe',
  NO: 'europe',
  DK: 'europe',
  FI: 'europe',
  IE: 'europe',
  PT: 'europe',
  PL: 'europe',
  // オセアニア
  AU: 'asia',
  NZ: 'asia',
};

/**
 * 国コードから送料地域を取得
 */
export function getShippingRegion(countryCode: string | null): ShippingRegion {
  if (!countryCode) return 'domestic';
  return REGION_MAPPING[countryCode.toUpperCase()] ?? 'other';
}
