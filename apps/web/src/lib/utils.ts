export function formatPrice(
  price: number,
  options?: string | { currency?: string; divideBy100?: boolean; locale?: string }
): string {
  let divideBy100 = false;
  let locale = 'ja';

  if (typeof options === 'string') {
  } else if (options) {
    divideBy100 = options.divideBy100 || false;
    locale = options.locale || 'ja';
  }

  const amount = divideBy100 ? price / 100 : price;

  if (locale !== 'ja') {
    return `$${amount / 100}`;
  }

  return `¥${amount.toLocaleString()}`;
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
