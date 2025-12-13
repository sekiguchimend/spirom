/**
 * バリデーションパターンと関数
 */

// ============================================
// 正規表現パターン
// ============================================

export const VALIDATION_PATTERNS = {
  /** メールアドレス */
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** 郵便番号（7桁、ハイフンあり/なし両対応） */
  POSTAL_CODE: /^\d{7}$|^\d{3}-\d{4}$/,
  /** 電話番号 */
  PHONE: /^[0-9-]{10,14}$/,
  /** パスワード（8文字以上） */
  PASSWORD_MIN_LENGTH: /^.{8,}$/,
} as const;

// ============================================
// バリデーション関数
// ============================================

/**
 * メールアドレスのバリデーション
 */
export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return '必須';
  if (!VALIDATION_PATTERNS.EMAIL.test(value)) {
    return '正しいメールアドレスを入力してください';
  }
  return undefined;
}

/**
 * パスワードのバリデーション
 */
export function validatePassword(value: string): string | undefined {
  if (!value) return '必須';
  if (value.length < 8) {
    return 'パスワードは8文字以上で入力してください';
  }
  return undefined;
}

/**
 * 必須フィールドのバリデーション
 */
export function validateRequired(value: string, fieldName?: string): string | undefined {
  if (!value.trim()) {
    return fieldName ? `${fieldName}は必須です` : '必須';
  }
  return undefined;
}

/**
 * 郵便番号のバリデーション
 */
export function validatePostalCode(value: string): string | undefined {
  if (!value.trim()) return '必須';
  // ハイフンを除去して検証
  const normalized = value.replace(/-/g, '');
  if (!/^\d{7}$/.test(normalized)) {
    return '郵便番号は7桁で入力してください';
  }
  return undefined;
}

/**
 * 電話番号のバリデーション
 */
export function validatePhone(value: string): string | undefined {
  if (!value.trim()) return undefined; // 電話番号は任意の場合が多い
  if (!VALIDATION_PATTERNS.PHONE.test(value)) {
    return '正しい電話番号を入力してください';
  }
  return undefined;
}

/**
 * パスワード確認のバリデーション
 */
export function validatePasswordConfirm(
  password: string,
  confirmPassword: string
): string | undefined {
  if (!confirmPassword) return '必須';
  if (password !== confirmPassword) {
    return 'パスワードが一致しません';
  }
  return undefined;
}
