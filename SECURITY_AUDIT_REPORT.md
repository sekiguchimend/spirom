# ECサイト セキュリティ監査レポート

## 監査日
2024年12月

## 監査対象
Spirom ECサイト（Next.js + Rust API + Supabase）

---

## 1. 認証・認可セキュリティ

### ✅ 良好な点

1. **JWT認証の実装**
   - JWTトークンによる認証が実装されている
   - アクセストークンとリフレッシュトークンの分離
   - トークンブラックリスト機能でログアウト後の無効化に対応

2. **パスワードセキュリティ**
   - Argon2によるパスワードハッシュ化（`apps/api/src/services/password.rs`）
   - パスワードは平文で保存されていない
   - パスワード変更時に全トークンを無効化する仕組み

3. **認可制御**
   - Row Level Security (RLS) によるデータベースレベルのアクセス制御
   - 管理者権限の適切な分離
   - ユーザーは自分のデータのみアクセス可能

### ⚠️ 改善推奨事項

1. **開発環境の認証バイパス**
   ```rust:apps/api/src/middleware/auth.rs
   // 開発環境での認証バイパス機能が存在
   // 本番環境では無効化されているが、設定ミスに注意
   ```
   - **推奨**: 本番環境では環境変数 `ALLOW_DEV_AUTH_BYPASS` が設定されていないことを確認するCI/CDチェックを追加

2. **トークン有効期限**
   - アクセストークン: 1時間（3600秒）
   - リフレッシュトークン: 30日（2592000秒）
   - **推奨**: リフレッシュトークンの有効期限を短縮（例: 7日）し、定期的な再認証を促す

---

## 2. SQLインジェクション対策

### ✅ 良好な点

1. **パラメータ化クエリ**
   - SupabaseのREST APIを使用（自動的にパラメータ化）
   - 直接SQL文字列連結によるクエリ構築を回避
   - URLエンコーディングによる値のエスケープ（`urlencoding::encode`）

2. **Row Level Security (RLS)**
   - データベースレベルでのアクセス制御
   - ユーザーは自分のデータのみアクセス可能

### ✅ 問題なし

SQLインジェクションの脆弱性は見つかりませんでした。

---

## 3. XSS（クロスサイトスクリプティング）対策

### ✅ 良好な点

1. **HTMLエスケープ関数**
   ```typescript:apps/web/src/lib/validation.ts
   export function escapeHtml(text: string): string {
     // &, <, >, ", ' をエスケープ
   }
   ```

2. **Content Security Policy (CSP)**
   - Next.js設定でCSPヘッダーを設定
   - `unsafe-inline` の使用を最小限に抑制
   - Stripeなどの必要な外部ドメインのみ許可

3. **JSON-LDの安全な処理**
   ```typescript:apps/web/src/lib/safeJsonLd.ts
   // </script> タグのエスケープ処理
   ```

4. **危険な文字列の検出**
   ```typescript:apps/web/src/lib/validation.ts
   export function containsDangerousChars(text: string): boolean {
     // <script>, javascript:, onclick= などを検出
   }
   ```

### ⚠️ 改善推奨事項

1. **CSPの `unsafe-inline` 使用**
   ```typescript:apps/web/next.config.ts
   "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.sanity.io https://js.stripe.com"
   ```
   - **推奨**: `unsafe-inline` を削除し、nonceベースのCSPに移行
   - ただし、StripeやSanityなどのサードパーティライブラリの要件を確認が必要
   - Next.js 13+ では `nonce` のサポートがあるため、移行可能

2. **ユーザー入力のサニタイゼーション**
   - レビュー機能は現在フロントエンドに実装されていない（API側のみ存在）
   - 商品名、説明、住所などの表示はReactの制御コンポーネントで管理されており、直接HTMLに出力されていない ✅
   - **推奨**: 将来的にレビュー表示機能を追加する場合は、`escapeHtml` を使用してサニタイゼーションを実施
   - **推奨**: ブログ記事のPortableTextコンポーネントが適切にサニタイズされているか確認（Sanity側の設定に依存）

---

## 4. CSRF（クロスサイトリクエストフォージェリ）対策

### ✅ 良好な点

1. **Origin検証**
   ```typescript:apps/web/src/app/api/v1/[...path]/route.ts
   function enforceCsrf(req: NextRequest, method: string): NextResponse | null {
     // 状態変更リクエスト（POST, PUT, DELETE等）は同一オリジンのみ許可
   }
   ```

2. **セッションIDの署名**
   - セッションIDにHMAC署名を付与
   - クライアントが偽造できない仕組み

### ⚠️ 改善推奨事項

1. **CSRFトークンの実装**
   - 現在はOrigin検証のみ
   - **推奨**: より強固なCSRF対策として、CSRFトークン（Double Submit Cookie）の実装を検討

---

## 5. セキュリティヘッダー

### ✅ 良好な点

1. **包括的なセキュリティヘッダー**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Strict-Transport-Security` (HSTS)
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy`
   - `Content-Security-Policy`

2. **環境別の設定**
   - 本番環境でのみHSTSを有効化

### ✅ 問題なし

セキュリティヘッダーの実装は適切です。

---

## 6. レート制限

### ✅ 良好な点

1. **IPベースのレート制限**
   ```rust:apps/api/src/middleware/rate_limiter.rs
   // IPアドレスベースのレート制限
   // デフォルト: 60秒間で最大リクエスト数（設定可能）
   ```

2. **プロキシ経由のIP取得**
   - `X-Forwarded-For` ヘッダーを考慮

### ⚠️ 改善推奨事項

1. **レート制限の設定値**
   ```rust:apps/api/src/main.rs
   // デフォルト: 60秒間に200リクエスト
   let rate_limit_window = std::env::var("RATE_LIMIT_WINDOW_SECONDS")
       .ok()
       .and_then(|s| s.parse().ok())
       .unwrap_or(60);
   let rate_limit_max = std::env::var("RATE_LIMIT_MAX_REQUESTS")
       .ok()
       .and_then(|s| s.parse().ok())
       .unwrap_or(200);
   ```
   - **推奨**: エンドポイントごとに適切なレート制限値を設定
     - 認証エンドポイント (`/auth/login`, `/auth/register`): 5回/分
     - 一般API: 100回/分（現在の200回/分は緩い）
     - 決済エンドポイント (`/payments/*`): 10回/分
   - **推奨**: 環境変数で設定可能だが、デフォルト値をより厳しくする

2. **ユーザー認証後のレート制限**
   - IPベースのみではなく、認証済みユーザーIDベースのレート制限も検討
   - 現在は全エンドポイントで同一のレート制限が適用されている

---

## 7. 支払いセキュリティ

### ✅ 良好な点

1. **Stripe Webhook署名検証**
   ```rust:apps/api/src/services/payment/stripe.rs
   fn verify_webhook(&self, payload: &[u8], signature: &str) -> Result<WebhookEvent, PaymentError> {
     // HMAC-SHA256による署名検証
     // タイムスタンプのリプレイ攻撃対策
   }
   ```

2. **金額検証**
   - Stripe側の金額とDB側の金額を照合
   - 不一致時は自動返金とキャンセル

3. **冪等性キー**
   - PaymentIntent作成時にIdempotency-Keyを使用
   - 同一注文の重複決済を防止

4. **注文の有効期限**
   - 注文作成から一定時間（デフォルト30分）経過後は決済不可
   - 古い価格での決済を防止

5. **返金権限**
   - 返金は管理者のみ許可

### ✅ 問題なし

支払いセキュリティの実装は適切です。

---

## 8. セッション管理

### ✅ 良好な点

1. **署名付きセッションID**
   ```typescript:apps/web/src/app/api/v1/[...path]/route.ts
   function signSessionId(sessionId: string): string {
     return createHmac('sha256', getSessionSecret()).update(sessionId).digest('hex');
   }
   ```

2. **セキュアなCookie設定**
   ```typescript
   response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
     httpOnly: true,
     secure, // 本番環境では true
     sameSite: 'lax',
     maxAge: 60 * 60 * 24 * 30, // 30日
   });
   ```

### ⚠️ 改善推奨事項

1. **セッション有効期限**
   - 現在30日間
   - **推奨**: セッション有効期限を短縮（例: 7日）し、アクティビティベースの延長を検討

---

## 9. 環境変数とシークレット管理

### ✅ 良好な点

1. **環境変数の分離**
   - `.env.example` ファイルで必要な環境変数を明示
   - 公開すべきでないシークレットは `NEXT_PUBLIC_` プレフィックスなし

2. **JWTシークレットの検証**
   - 起動時に弱いシークレット（"change-me"等）を拒否する仕組みがある

### ⚠️ 改善推奨事項

1. **環境変数の検証**
   - **推奨**: アプリケーション起動時に必須環境変数の存在と妥当性を検証するチェックを追加

2. **シークレットのローテーション**
   - **推奨**: 定期的なシークレットローテーション手順を文書化

---

## 10. エラーハンドリング

### ✅ 良好な点

1. **エラーメッセージの制御**
   - 本番環境では詳細なエラーメッセージを非表示
   - `API_DEBUG_ERRORS` 環境変数で制御

2. **ユーザー列挙対策**
   ```rust:apps/api/src/handlers/auth.rs
   // パスワードリセット要求時、ユーザー存在の有無を外部に漏らさない
   ```

### ✅ 問題なし

エラーハンドリングは適切です。

---

## 11. データベースセキュリティ

### ✅ 良好な点

1. **Row Level Security (RLS)**
   - すべてのテーブルでRLSが有効
   - ユーザーは自分のデータのみアクセス可能

2. **サービスロールの分離**
   - 管理者操作は `service_role` を使用
   - 通常ユーザーは `anon` キーを使用

3. **トークンブラックリスト**
   - ログアウトやパスワード変更時にトークンを無効化

### ✅ 問題なし

データベースセキュリティの実装は適切です。

---

## 12. APIセキュリティ

### ✅ 良好な点

1. **プロキシトークン**
   - BFF直叩き対策としてプロキシトークンを実装
   - ブラウザには露出しない（`NEXT_PUBLIC_` なし）

2. **CORS設定**
   ```rust:apps/api/src/main.rs
   let cors = CorsLayer::new()
       .allow_origin(AllowOrigin::list(allowed_origins))
       .allow_credentials(true);
   ```
   - 適切なオリジンのみ許可
   - 環境変数で設定可能

3. **リクエストID**
   - 相関IDによるログ追跡

4. **リクエストボディサイズ制限**
   ```rust:apps/api/src/main.rs
   let request_body_limit = std::env::var("REQUEST_BODY_LIMIT_BYTES")
       .ok()
       .and_then(|s| s.parse().ok())
       .unwrap_or(1024 * 1024); // デフォルト1MB
   ```
   - DoS攻撃対策としてリクエストボディサイズを制限

5. **リクエストタイムアウト**
   ```rust:apps/api/src/main.rs
   let request_timeout_seconds = std::env::var("REQUEST_TIMEOUT_SECONDS")
       .ok()
       .and_then(|s| s.parse().ok())
       .unwrap_or(30); // デフォルト30秒
   ```
   - SlowLoris攻撃対策としてタイムアウトを設定

### ⚠️ 改善推奨事項

1. **APIバージョニング**
   - `/api/v1/` でバージョニングされているが、将来のバージョンアップ時の移行計画を文書化

---

## 13. ファイルアップロード

### ⚠️ 確認が必要

1. **ファイルアップロード機能の確認**
   - 現在のコードベースではファイルアップロード機能が見当たらない
   - **推奨**: 将来的に追加する場合は以下を実装
     - ファイルタイプの検証
     - ファイルサイズの制限
     - ウイルススキャン
     - 安全なファイル名の生成

---

## 14. ログと監視

### ⚠️ 改善推奨事項

1. **セキュリティイベントのログ**
   - **推奨**: 以下のイベントをログに記録
     - 認証失敗（ブルートフォース攻撃の検出）
     - 権限エラー（不正アクセス試行）
     - レート制限のトリガー
     - 支払い関連の異常（金額不一致等）

2. **ログの機密情報**
   - トークンやパスワードがログに出力されないよう注意
   - 現在の実装では `safeTokenFingerprint` でハッシュ化されている ✅

---

## 総合評価

### セキュリティレベル: **良好** ✅

このECサイトは、主要なセキュリティ対策が適切に実装されています。

### 強み
- ✅ SQLインジェクション対策（RLS + パラメータ化クエリ）
- ✅ XSS対策（HTMLエスケープ + CSP）
- ✅ CSRF対策（Origin検証）
- ✅ 認証・認可（JWT + RLS）
- ✅ パスワードセキュリティ（Argon2）
- ✅ 支払いセキュリティ（Stripe署名検証 + 金額検証）
- ✅ セキュリティヘッダー（包括的）
- ✅ レート制限（IPベース）

### 改善推奨事項（優先度順）

1. **高優先度**
   - CSPの `unsafe-inline` 削除（nonceベースへの移行）
   - レート制限値の明確化とエンドポイント別設定
   - 環境変数の起動時検証

2. **中優先度**
   - CSRFトークンの実装（Double Submit Cookie）
   - セッション有効期限の短縮
   - リフレッシュトークン有効期限の短縮

3. **低優先度**
   - セキュリティイベントのログ強化
   - APIバージョニングの移行計画文書化

---

## 次のステップ

1. 改善推奨事項の優先度に基づいて修正を実施
2. 定期的なセキュリティ監査の実施（四半期ごと推奨）
3. 依存関係の脆弱性スキャン（`npm audit`, `cargo audit`）
4. ペネトレーションテストの実施（本番環境デプロイ前）

---

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Stripe Security Best Practices](https://stripe.com/docs/security/guide)

