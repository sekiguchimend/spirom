/**
 * アプリケーション全体で使用するメッセージ定数
 */

// ============================================
// バリデーションメッセージ
// ============================================

export const VALIDATION_MESSAGES = {
  REQUIRED: '必須',
  INVALID_EMAIL: '正しいメールアドレスを入力してください',
  INVALID_PASSWORD: 'パスワードは8文字以上で入力してください',
  INVALID_PHONE: '正しい電話番号を入力してください',
  INVALID_POSTAL_CODE: '郵便番号は7桁で入力してください',
  PASSWORD_MISMATCH: 'パスワードが一致しません',
} as const;

// ============================================
// 認証関連メッセージ
// ============================================

export const AUTH_MESSAGES = {
  LOGIN_SUCCESS: 'ログインしました',
  LOGIN_FAILED: 'ログインに失敗しました',
  LOGOUT_SUCCESS: 'ログアウトしました',
  LOGOUT_FAILED: 'ログアウトに失敗しました',
  REGISTER_SUCCESS: '登録が完了しました',
  REGISTER_FAILED: '登録に失敗しました',
  SESSION_EXPIRED: 'セッションが切れました。再度ログインしてください',
  NOT_AUTHENTICATED: 'ログインが必要です',
} as const;

// ============================================
// 住所関連メッセージ
// ============================================

export const ADDRESS_MESSAGES = {
  SAVE_SUCCESS: '住所を保存しました',
  SAVE_FAILED: '住所の登録に失敗しました',
  DELETE_SUCCESS: '住所を削除しました',
  DELETE_FAILED: '住所の削除に失敗しました',
  FETCH_FAILED: '住所の取得に失敗しました',
} as const;

// ============================================
// 注文関連メッセージ
// ============================================

export const ORDER_MESSAGES = {
  CREATE_SUCCESS: '注文が完了しました',
  CREATE_FAILED: '注文の作成に失敗しました',
  FETCH_FAILED: '注文情報の取得に失敗しました',
} as const;

// ============================================
// 決済関連メッセージ
// ============================================

export const PAYMENT_MESSAGES = {
  PROCESSING: '決済処理中...',
  SUCCESS: '決済が完了しました',
  FAILED: '決済処理中にエラーが発生しました',
  INTENT_FAILED: '決済の準備に失敗しました',
} as const;

// ============================================
// カート関連メッセージ
// ============================================

export const CART_MESSAGES = {
  ADD_SUCCESS: 'カートに追加しました',
  REMOVE_SUCCESS: 'カートから削除しました',
  EMPTY: 'カートは空です',
} as const;

// ============================================
// 汎用エラーメッセージ
// ============================================

export const ERROR_MESSAGES = {
  UNKNOWN: '予期しないエラーが発生しました',
  NETWORK: 'ネットワークエラーが発生しました',
  SERVER: 'サーバーエラーが発生しました',
  NOT_FOUND: 'ページが見つかりません',
} as const;
