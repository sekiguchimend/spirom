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
  /** パスワード要件 */
  PASSWORD_MIN_LENGTH: /^.{8,}$/,
  PASSWORD_HAS_UPPERCASE: /[A-Z]/,
  PASSWORD_HAS_LOWERCASE: /[a-z]/,
  PASSWORD_HAS_NUMBER: /[0-9]/,
  PASSWORD_HAS_SPECIAL: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
} as const;

/** よく使われる弱いパスワードのリスト */
const COMMON_PASSWORDS = [
  'password', 'password1', 'password123', '12345678', '123456789',
  'qwerty123', 'abc12345', 'admin123', 'letmein', 'welcome1',
  'monkey123', 'dragon123', 'master123', 'login123',
] as const;

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
 * パスワードのバリデーション（強化版）
 * - 8文字以上
 * - 大文字を含む
 * - 小文字を含む
 * - 数字を含む
 * - 一般的な弱いパスワードを拒否
 */
export function validatePassword(value: string): string | undefined {
  if (!value) return '必須';

  const errors: string[] = [];

  if (value.length < 8) {
    errors.push('8文字以上');
  }
  if (!VALIDATION_PATTERNS.PASSWORD_HAS_UPPERCASE.test(value)) {
    errors.push('大文字を含む');
  }
  if (!VALIDATION_PATTERNS.PASSWORD_HAS_LOWERCASE.test(value)) {
    errors.push('小文字を含む');
  }
  if (!VALIDATION_PATTERNS.PASSWORD_HAS_NUMBER.test(value)) {
    errors.push('数字を含む');
  }

  if (errors.length > 0) {
    return `パスワードは${errors.join('、')}必要があります`;
  }

  // 一般的な弱いパスワードをチェック
  const lowerValue = value.toLowerCase();
  if (COMMON_PASSWORDS.some(pwd => lowerValue.includes(pwd))) {
    return '一般的すぎるパスワードは使用できません';
  }

  return undefined;
}

/**
 * パスワード強度を計算（0-4のスコア）
 */
export function getPasswordStrength(value: string): number {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (VALIDATION_PATTERNS.PASSWORD_HAS_UPPERCASE.test(value)) score++;
  if (VALIDATION_PATTERNS.PASSWORD_HAS_LOWERCASE.test(value)) score++;
  if (VALIDATION_PATTERNS.PASSWORD_HAS_NUMBER.test(value)) score++;
  if (VALIDATION_PATTERNS.PASSWORD_HAS_SPECIAL.test(value)) score++;
  return Math.min(4, Math.floor(score / 1.5));
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
