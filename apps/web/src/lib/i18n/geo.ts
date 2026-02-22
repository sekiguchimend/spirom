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
 * 送料地域グループの定義（日本郵便EMS地帯に基づく）
 * - domestic: 国内（ゆうパック）
 * - zone1_east_asia: 第1地帯（中国・韓国・台湾・香港）
 * - zone2_asia: 第2地帯（その他アジア）
 * - zone3: 第3地帯（ヨーロッパ・オセアニア・カナダ・中近東）
 * - zone4_usa: 第4地帯（アメリカ）
 * - zone5: 第5地帯（南米・アフリカ等）
 */
export type ShippingRegion =
  | 'domestic'
  | 'zone1_east_asia'
  | 'zone2_asia'
  | 'zone3'
  | 'zone4_usa'
  | 'zone5';

const REGION_MAPPING: Record<string, ShippingRegion> = {
  // 国内
  JP: 'domestic',

  // 第1地帯: 東アジア（中国・韓国・台湾・香港）
  CN: 'zone1_east_asia',
  KR: 'zone1_east_asia',
  TW: 'zone1_east_asia',
  HK: 'zone1_east_asia',

  // 第2地帯: その他アジア
  SG: 'zone2_asia',
  TH: 'zone2_asia',
  MY: 'zone2_asia',
  ID: 'zone2_asia',
  PH: 'zone2_asia',
  VN: 'zone2_asia',
  IN: 'zone2_asia',
  BD: 'zone2_asia',
  PK: 'zone2_asia',
  LK: 'zone2_asia',
  NP: 'zone2_asia',
  MM: 'zone2_asia',
  KH: 'zone2_asia',
  LA: 'zone2_asia',
  BN: 'zone2_asia',
  MO: 'zone2_asia',
  MN: 'zone2_asia',

  // 第4地帯: アメリカ（グアム等含む）
  US: 'zone4_usa',
  GU: 'zone4_usa',
  PR: 'zone4_usa',
  VI: 'zone4_usa',
  AS: 'zone4_usa',
  MP: 'zone4_usa',

  // 第3地帯: ヨーロッパ
  GB: 'zone3',
  DE: 'zone3',
  FR: 'zone3',
  IT: 'zone3',
  ES: 'zone3',
  NL: 'zone3',
  BE: 'zone3',
  AT: 'zone3',
  CH: 'zone3',
  SE: 'zone3',
  NO: 'zone3',
  DK: 'zone3',
  FI: 'zone3',
  IE: 'zone3',
  PT: 'zone3',
  PL: 'zone3',
  GR: 'zone3',
  CZ: 'zone3',
  HU: 'zone3',
  RO: 'zone3',
  SK: 'zone3',
  HR: 'zone3',
  SI: 'zone3',
  BG: 'zone3',
  LT: 'zone3',
  LV: 'zone3',
  EE: 'zone3',
  LU: 'zone3',
  MT: 'zone3',
  CY: 'zone3',
  IS: 'zone3',
  RU: 'zone3',
  UA: 'zone3',
  BY: 'zone3',
  MD: 'zone3',

  // 第3地帯: オセアニア
  AU: 'zone3',
  NZ: 'zone3',
  FJ: 'zone3',
  PG: 'zone3',
  NC: 'zone3',
  PF: 'zone3',

  // 第3地帯: カナダ・メキシコ
  CA: 'zone3',
  MX: 'zone3',

  // 第3地帯: 中近東
  AE: 'zone3',
  SA: 'zone3',
  IL: 'zone3',
  TR: 'zone3',
  QA: 'zone3',
  KW: 'zone3',
  BH: 'zone3',
  OM: 'zone3',
  JO: 'zone3',
  LB: 'zone3',
  EG: 'zone3',
  IR: 'zone3',
  IQ: 'zone3',

  // 第5地帯: 南米
  BR: 'zone5',
  AR: 'zone5',
  CL: 'zone5',
  CO: 'zone5',
  PE: 'zone5',
  VE: 'zone5',
  EC: 'zone5',
  UY: 'zone5',
  PY: 'zone5',
  BO: 'zone5',

  // 第5地帯: アフリカ
  ZA: 'zone5',
  NG: 'zone5',
  KE: 'zone5',
  GH: 'zone5',
  TZ: 'zone5',
  ET: 'zone5',
  MA: 'zone5',
  TN: 'zone5',
  SN: 'zone5',
};

/**
 * 国コードから送料地域を取得
 */
export function getShippingRegion(countryCode: string | null): ShippingRegion {
  if (!countryCode) return 'domestic';
  return REGION_MAPPING[countryCode.toUpperCase()] ?? 'zone5';
}
