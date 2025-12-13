/**
 * JSON-LD を <script type="application/ld+json"> に埋め込む際の XSS 対策。
 * - `</script>` などの文字列が混入しても script を抜けられないようにする
 * - HTML パーサに解釈されやすい文字を Unicode エスケープする
 *
 * 参考: JSON.stringify は `<` をそのまま出力するため、HTML文脈では安全ではない。
 */
export function safeJsonLd(data: unknown): string {
  const json = JSON.stringify(data);
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    // JS パーサの落とし穴を回避（JSON-LDの中に改行として扱われ得る）
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function safeJsonLdFromString(input: string): string | null {
  try {
    return safeJsonLd(JSON.parse(input));
  } catch {
    return null;
  }
}


