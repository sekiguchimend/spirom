/**
 * 価格をフォーマットする（円単位）
 * @param price - 価格（円）
 * @returns フォーマットされた価格文字列（例: "¥1,234"）
 */
export function formatPrice(price: number): string {
  return `¥${price.toLocaleString()}`;
}
