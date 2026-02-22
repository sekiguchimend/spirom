/**
 * 地域別送料設定
 * 国/地域に応じた送料を計算
 */

import { type ShippingRegion, getShippingRegion } from '@/lib/i18n/geo';
import { type Locale } from '@/lib/i18n/config';

// 通貨設定
export interface CurrencyConfig {
  code: string;
  symbol: string;
  rate: number; // JPYからの換算レート
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  JPY: { code: 'JPY', symbol: '¥', rate: 1 },
  USD: { code: 'USD', symbol: '$', rate: 0.0067 }, // 1 JPY = 0.0067 USD (approx)
  EUR: { code: 'EUR', symbol: '€', rate: 0.0062 },
  GBP: { code: 'GBP', symbol: '£', rate: 0.0053 },
};

// 言語→通貨のマッピング
export const LOCALE_CURRENCY: Record<Locale, string> = {
  ja: 'JPY',
  en: 'USD',
  zh: 'JPY', // 中国からの注文もJPY（日本円）で決済
  ko: 'JPY', // 韓国からの注文もJPY（日本円）で決済
};

// 送料設定（JPY基準）
// 日本郵便EMS料金表に基づく（1kg想定、梱包込みアパレル商品）
// 参考: https://www.post.japanpost.jp/int/charge/list/
export interface ShippingRate {
  standard: number;
  express: number;
  freeThreshold: number; // 送料無料になる金額
}

export const SHIPPING_RATES: Record<ShippingRegion, ShippingRate> = {
  // 国内配送（ゆうパック60サイズ全国平均）
  domestic: {
    standard: 700,
    express: 1100,
    freeThreshold: 10000, // 1万円以上で送料無料
  },
  // 第1地帯: 東アジア（EMS 1kg: ¥2,200）
  zone1_east_asia: {
    standard: 2000,
    express: 2500,
    freeThreshold: 20000, // 2万円以上で送料無料
  },
  // 第2地帯: その他アジア（EMS 1kg: ¥3,150）
  zone2_asia: {
    standard: 3000,
    express: 4000,
    freeThreshold: 30000, // 3万円以上で送料無料
  },
  // 第3地帯: ヨーロッパ・オセアニア・カナダ・中近東（EMS 1kg: ¥4,400）
  zone3: {
    standard: 4500,
    express: 6000,
    freeThreshold: 50000, // 5万円以上で送料無料
  },
  // 第4地帯: アメリカ（EMS 1kg: ¥5,300）
  zone4_usa: {
    standard: 5500,
    express: 7500,
    freeThreshold: 50000, // 5万円以上で送料無料
  },
  // 第5地帯: 南米・アフリカ等（EMS 1kg: ¥5,100）
  zone5: {
    standard: 5500,
    express: 7500,
    freeThreshold: 60000, // 6万円以上で送料無料
  },
};

/**
 * 送料を計算
 */
export function calculateShipping(
  subtotal: number,
  countryCode: string | null,
  shippingMethod: 'standard' | 'express' = 'standard'
): number {
  const region = getShippingRegion(countryCode);
  const rates = SHIPPING_RATES[region];

  // 送料無料判定
  if (subtotal >= rates.freeThreshold) {
    return 0;
  }

  return rates[shippingMethod];
}

/**
 * 送料無料までの残り金額を取得
 */
export function getAmountForFreeShipping(
  subtotal: number,
  countryCode: string | null
): number {
  const region = getShippingRegion(countryCode);
  const rates = SHIPPING_RATES[region];

  const remaining = rates.freeThreshold - subtotal;
  return remaining > 0 ? remaining : 0;
}

/**
 * 金額を通貨に変換してフォーマット
 */
export function formatPrice(
  amount: number,
  locale: Locale,
  options?: { showCurrency?: boolean }
): string {
  const currencyCode = LOCALE_CURRENCY[locale];
  const currency = CURRENCIES[currencyCode];

  // 通貨変換
  const convertedAmount = Math.round(amount * currency.rate);

  // フォーマット
  const formatter = new Intl.NumberFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    style: options?.showCurrency ? 'currency' : 'decimal',
    currency: currencyCode,
    minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
  });

  if (options?.showCurrency) {
    return formatter.format(convertedAmount);
  }

  return `${currency.symbol}${formatter.format(convertedAmount)}`;
}

/**
 * 地域の送料情報を取得
 */
export function getShippingInfo(countryCode: string | null, locale: Locale) {
  const region = getShippingRegion(countryCode);
  const rates = SHIPPING_RATES[region];

  return {
    region,
    standardRate: formatPrice(rates.standard, locale),
    expressRate: formatPrice(rates.express, locale),
    freeThreshold: formatPrice(rates.freeThreshold, locale),
  };
}
