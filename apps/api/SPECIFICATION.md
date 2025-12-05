# Spirom EC API バックエンド仕様書

バージョン: 1.0
作成日: 2025年12月5日
技術スタック: Rust (Axum Framework) + ScyllaDB

---

## 1. 概要

本仕様書は、Spirom ECサイトのバックエンドAPIの詳細仕様を定義する。

### 1.1 技術スタック

| 項目 | 技術 |
|------|------|
| 言語 | Rust 1.75+ |
| Webフレームワーク | Axum 0.7 |
| データベース | ScyllaDB (Cassandra互換) |
| 非同期ランタイム | Tokio |
| シリアライゼーション | Serde |
| 認証 | JWT (jsonwebtoken) |
| バリデーション | validator |
| ロギング | tracing |

### 1.2 設計原則

- **RESTful API**: リソース指向のエンドポイント設計
- **レイヤードアーキテクチャ**: Handler → Service → Repository
- **エラーハンドリング**: 統一されたエラーレスポンス形式
- **べき等性**: PUT/DELETEはべき等に設計

---

## 2. データベース設計 (ScyllaDB)

### 2.1 キースペース

```cql
CREATE KEYSPACE spirom WITH REPLICATION = {
  'class': 'NetworkTopologyStrategy',
  'datacenter1': 3
};
```

### 2.2 テーブル設計

#### 2.2.1 products (商品)

```cql
CREATE TABLE products (
  id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  price BIGINT,
  compare_at_price BIGINT,
  currency TEXT,
  category_id UUID,
  images LIST<TEXT>,
  stock INT,
  sku TEXT,
  weight INT,
  is_active BOOLEAN,
  is_featured BOOLEAN,
  tags SET<TEXT>,
  metadata MAP<TEXT, TEXT>,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  PRIMARY KEY (id)
);

-- スラッグによる検索用
CREATE TABLE products_by_slug (
  slug TEXT,
  id UUID,
  PRIMARY KEY (slug)
);

-- カテゴリ別検索用
CREATE TABLE products_by_category (
  category_id UUID,
  created_at TIMESTAMP,
  id UUID,
  name TEXT,
  price BIGINT,
  images LIST<TEXT>,
  is_active BOOLEAN,
  PRIMARY KEY (category_id, created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- 注目商品用
CREATE TABLE featured_products (
  bucket INT,
  sort_order INT,
  id UUID,
  name TEXT,
  price BIGINT,
  images LIST<TEXT>,
  PRIMARY KEY (bucket, sort_order)
);
```

#### 2.2.2 categories (カテゴリ)

```cql
CREATE TABLE categories (
  id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  parent_id UUID,
  image_url TEXT,
  is_active BOOLEAN,
  sort_order INT,
  product_count INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE categories_by_slug (
  slug TEXT,
  id UUID,
  PRIMARY KEY (slug)
);
```

#### 2.2.3 users (ユーザー)

```cql
CREATE TABLE users (
  id UUID,
  email TEXT,
  password_hash TEXT,
  name TEXT,
  phone TEXT,
  is_active BOOLEAN,
  is_verified BOOLEAN,
  role TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_login_at TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE users_by_email (
  email TEXT,
  id UUID,
  password_hash TEXT,
  is_active BOOLEAN,
  role TEXT,
  PRIMARY KEY (email)
);
```

#### 2.2.4 addresses (住所)

```cql
CREATE TABLE addresses (
  user_id UUID,
  id UUID,
  label TEXT,
  postal_code TEXT,
  prefecture TEXT,
  city TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  phone TEXT,
  is_default BOOLEAN,
  created_at TIMESTAMP,
  PRIMARY KEY (user_id, id)
);
```

#### 2.2.5 carts (カート)

```cql
CREATE TABLE carts (
  session_id TEXT,
  product_id UUID,
  quantity INT,
  added_at TIMESTAMP,
  PRIMARY KEY (session_id, product_id)
);

CREATE TABLE cart_metadata (
  session_id TEXT,
  user_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  PRIMARY KEY (session_id)
);
```

#### 2.2.6 orders (注文)

```cql
CREATE TABLE orders (
  id UUID,
  user_id UUID,
  order_number TEXT,
  status TEXT,
  subtotal BIGINT,
  shipping_fee BIGINT,
  tax BIGINT,
  total BIGINT,
  currency TEXT,
  shipping_address FROZEN<address_type>,
  billing_address FROZEN<address_type>,
  payment_method TEXT,
  payment_status TEXT,
  payment_id TEXT,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TYPE address_type (
  name TEXT,
  postal_code TEXT,
  prefecture TEXT,
  city TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  phone TEXT
);

CREATE TABLE orders_by_user (
  user_id UUID,
  created_at TIMESTAMP,
  id UUID,
  order_number TEXT,
  status TEXT,
  total BIGINT,
  PRIMARY KEY (user_id, created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC);

CREATE TABLE order_items (
  order_id UUID,
  product_id UUID,
  product_name TEXT,
  product_sku TEXT,
  price BIGINT,
  quantity INT,
  subtotal BIGINT,
  PRIMARY KEY (order_id, product_id)
);
```

#### 2.2.7 reviews (レビュー)

```cql
CREATE TABLE reviews (
  product_id UUID,
  created_at TIMESTAMP,
  id UUID,
  user_id UUID,
  user_name TEXT,
  rating INT,
  title TEXT,
  content TEXT,
  is_verified_purchase BOOLEAN,
  is_approved BOOLEAN,
  PRIMARY KEY (product_id, created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

---

## 3. API エンドポイント

### 3.1 認証 (Auth)

| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| POST | /api/v1/auth/register | ユーザー登録 | 不要 |
| POST | /api/v1/auth/login | ログイン | 不要 |
| POST | /api/v1/auth/logout | ログアウト | 必要 |
| POST | /api/v1/auth/refresh | トークン更新 | 必要 |
| POST | /api/v1/auth/forgot-password | パスワードリセット要求 | 不要 |
| POST | /api/v1/auth/reset-password | パスワードリセット実行 | 不要 |

### 3.2 ユーザー (Users)

| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| GET | /api/v1/users/me | 自分の情報取得 | 必要 |
| PUT | /api/v1/users/me | 自分の情報更新 | 必要 |
| GET | /api/v1/users/me/addresses | 住所一覧取得 | 必要 |
| POST | /api/v1/users/me/addresses | 住所追加 | 必要 |
| PUT | /api/v1/users/me/addresses/:id | 住所更新 | 必要 |
| DELETE | /api/v1/users/me/addresses/:id | 住所削除 | 必要 |

### 3.3 商品 (Products)

| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| GET | /api/v1/products | 商品一覧取得 | 不要 |
| GET | /api/v1/products/:slug | 商品詳細取得 | 不要 |
| GET | /api/v1/products/featured | 注目商品取得 | 不要 |
| GET | /api/v1/products/:id/reviews | レビュー一覧取得 | 不要 |
| POST | /api/v1/products/:id/reviews | レビュー投稿 | 必要 |

### 3.4 カテゴリ (Categories)

| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| GET | /api/v1/categories | カテゴリ一覧取得 | 不要 |
| GET | /api/v1/categories/:slug | カテゴリ詳細取得 | 不要 |
| GET | /api/v1/categories/:slug/products | カテゴリ内商品取得 | 不要 |

### 3.5 カート (Cart)

| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| GET | /api/v1/cart | カート取得 | 不要* |
| POST | /api/v1/cart/items | カートに追加 | 不要* |
| PUT | /api/v1/cart/items/:product_id | 数量更新 | 不要* |
| DELETE | /api/v1/cart/items/:product_id | カートから削除 | 不要* |
| DELETE | /api/v1/cart | カートクリア | 不要* |
| POST | /api/v1/cart/merge | ログイン時カート統合 | 必要 |

*セッションIDで識別

### 3.6 注文 (Orders)

| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| POST | /api/v1/orders | 注文作成 | 必要 |
| GET | /api/v1/orders | 注文履歴取得 | 必要 |
| GET | /api/v1/orders/:id | 注文詳細取得 | 必要 |
| POST | /api/v1/orders/:id/cancel | 注文キャンセル | 必要 |

### 3.7 決済 (Payment)

| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| POST | /api/v1/payment/intent | 決済インテント作成 | 必要 |
| POST | /api/v1/payment/confirm | 決済確定 | 必要 |
| POST | /api/v1/payment/webhook | Webhook受信 | 不要** |

**署名検証で認証

### 3.8 ヘルスチェック

| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| GET | /health | ヘルスチェック | 不要 |
| GET | /health/ready | Readinessチェック | 不要 |
| GET | /health/live | Livenessチェック | 不要 |

---

## 4. リクエスト/レスポンス仕様

### 4.1 共通レスポンス形式

#### 成功時
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

#### エラー時
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": [
      {
        "field": "email",
        "message": "有効なメールアドレスを入力してください"
      }
    ]
  }
}
```

### 4.2 エラーコード

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| VALIDATION_ERROR | 400 | バリデーションエラー |
| UNAUTHORIZED | 401 | 認証が必要 |
| FORBIDDEN | 403 | アクセス権限がない |
| NOT_FOUND | 404 | リソースが見つからない |
| CONFLICT | 409 | リソースの競合 |
| INTERNAL_ERROR | 500 | サーバー内部エラー |

### 4.3 認証ヘッダー

```
Authorization: Bearer <JWT_TOKEN>
X-Session-ID: <SESSION_ID>
```

---

## 5. 主要API詳細

### 5.1 POST /api/v1/auth/register

**リクエスト**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "山田 太郎",
  "phone": "090-1234-5678"
}
```

**レスポンス**
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "山田 太郎",
      "created_at": "2025-12-05T10:00:00Z"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIs...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
      "expires_in": 3600
    }
  }
}
```

### 5.2 GET /api/v1/products

**クエリパラメータ**
| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| page | int | 1 | ページ番号 |
| per_page | int | 20 | 1ページあたり件数 (max: 100) |
| category | string | - | カテゴリスラッグでフィルタ |
| min_price | int | - | 最低価格 |
| max_price | int | - | 最高価格 |
| sort | string | created_at | ソート項目 (price, name, created_at) |
| order | string | desc | 並び順 (asc, desc) |
| q | string | - | 検索クエリ |

**レスポンス**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "premium-headphones",
      "name": "プレミアムヘッドフォン",
      "price": 29800,
      "compare_at_price": 39800,
      "currency": "JPY",
      "images": ["https://cdn.example.com/products/1.jpg"],
      "is_active": true,
      "category": {
        "id": "...",
        "slug": "electronics",
        "name": "電子機器"
      }
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### 5.3 POST /api/v1/cart/items

**リクエスト**
```json
{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 2
}
```

**レスポンス**
```json
{
  "data": {
    "session_id": "sess_abc123",
    "items": [
      {
        "product_id": "550e8400-e29b-41d4-a716-446655440000",
        "product_name": "プレミアムヘッドフォン",
        "price": 29800,
        "quantity": 2,
        "subtotal": 59600,
        "image_url": "https://cdn.example.com/products/1.jpg"
      }
    ],
    "subtotal": 59600,
    "item_count": 2
  }
}
```

### 5.4 POST /api/v1/orders

**リクエスト**
```json
{
  "shipping_address_id": "550e8400-e29b-41d4-a716-446655440001",
  "billing_address_id": "550e8400-e29b-41d4-a716-446655440001",
  "payment_method": "credit_card",
  "notes": "配達時間指定: 午前中"
}
```

**レスポンス**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "order_number": "ORD-20251205-001",
    "status": "pending_payment",
    "subtotal": 59600,
    "shipping_fee": 500,
    "tax": 6010,
    "total": 66110,
    "currency": "JPY",
    "payment_intent_id": "pi_xxx",
    "created_at": "2025-12-05T10:00:00Z"
  }
}
```

---

## 6. 決済インターフェース

決済BaaSは未定のため、抽象化されたインターフェースを定義する。

### 6.1 PaymentProvider Trait

```rust
#[async_trait]
pub trait PaymentProvider: Send + Sync {
    /// 決済インテント作成
    async fn create_intent(&self, params: CreateIntentParams) -> Result<PaymentIntent, PaymentError>;

    /// 決済確定
    async fn confirm(&self, intent_id: &str) -> Result<PaymentResult, PaymentError>;

    /// 返金
    async fn refund(&self, payment_id: &str, amount: Option<i64>) -> Result<RefundResult, PaymentError>;

    /// Webhook署名検証
    fn verify_webhook(&self, payload: &[u8], signature: &str) -> Result<WebhookEvent, PaymentError>;
}
```

### 6.2 対応予定決済プロバイダ

- Stripe
- PayPay
- 楽天ペイ
- コンビニ決済

---

## 7. セキュリティ

### 7.1 認証・認可

- JWT (RS256) によるトークン認証
- Access Token有効期限: 1時間
- Refresh Token有効期限: 30日
- ロールベースアクセス制御 (RBAC): user, admin

### 7.2 セキュリティ対策

- パスワードハッシュ: Argon2id
- レート制限: 100 req/min (認証エンドポイント)
- CORS設定: 許可オリジンのみ
- SQLインジェクション: Prepared Statements使用
- XSS: 入力サニタイズ

---

## 8. パフォーマンス

### 8.1 目標値

| 指標 | 目標 |
|------|------|
| P50レイテンシ | < 50ms |
| P99レイテンシ | < 200ms |
| スループット | > 10,000 req/s |
| 可用性 | 99.9% |

### 8.2 最適化

- 接続プール: ScyllaDBコネクションプール
- キャッシュ: Cloudflare Workers KV
- 非同期処理: Tokio非同期ランタイム

---

## 9. 運用

### 9.1 ログ

- 構造化ログ (JSON形式)
- トレースID付与
- ログレベル: ERROR, WARN, INFO, DEBUG

### 9.2 メトリクス

- リクエスト数
- レイテンシ分布
- エラー率
- DB接続数

### 9.3 ヘルスチェック

- `/health`: 基本的な死活監視
- `/health/ready`: 依存サービス含む準備状態
- `/health/live`: プロセス生存確認

---

## 10. 環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| PORT | サーバーポート | 3001 |
| RUST_LOG | ログレベル | spirom_api=debug |
| SCYLLA_URI | ScyllaDB接続先 | 127.0.0.1:9042 |
| SCYLLA_KEYSPACE | キースペース名 | spirom |
| JWT_SECRET | JWT署名キー | (秘密鍵) |
| JWT_EXPIRY | アクセストークン有効期限(秒) | 3600 |
| CORS_ORIGINS | 許可オリジン | https://spirom.com |
| PAYMENT_API_KEY | 決済APIキー | (秘密鍵) |
| PAYMENT_WEBHOOK_SECRET | Webhook署名キー | (秘密鍵) |
