/**
 * 価格をフォーマットする（円単位）
 * @param price - 価格（円）
 * @param currencyOrOptions - 通貨コード（文字列）またはオプションオブジェクト
 * @returns フォーマットされた価格文字列（例: "¥1,234"）
 */
export function formatPrice(
  price: number,
  currencyOrOptions?: string | { currency?: string; divideBy100?: boolean }
): string {
  let currency = 'JPY';
  let divideBy100 = false;

  if (typeof currencyOrOptions === 'string') {
    currency = currencyOrOptions;
  } else if (currencyOrOptions) {
    currency = currencyOrOptions.currency || 'JPY';
    divideBy100 = currencyOrOptions.divideBy100 || false;
  }

  const amount = divideBy100 ? price / 100 : price;

  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * 日付をフォーマットする
 * @param dateString - ISO形式の日付文字列
 * @returns フォーマットされた日付文字列（例: "2024年1月1日"）
 */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString));
}
