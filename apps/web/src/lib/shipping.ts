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
};

// 送料設定（JPY基準）
export interface ShippingRate {
  standard: number;
  express: number;
  freeThreshold: number; // 送料無料になる金額
}

export const SHIPPING_RATES: Record<ShippingRegion, ShippingRate> = {
  domestic: {
    standard: 500,
    express: 800,
    freeThreshold: 10000, // 1万円以上で送料無料
  },
  asia: {
    standard: 1500,
    express: 2500,
    freeThreshold: 30000,
  },
  north_america: {
    standard: 2500,
    express: 4000,
    freeThreshold: 50000,
  },
  europe: {
    standard: 3000,
    express: 5000,
    freeThreshold: 50000,
  },
  other: {
    standard: 3500,
    express: 6000,
    freeThreshold: 60000,
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
