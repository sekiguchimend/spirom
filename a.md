# Spirom プロジェクト環境変数情報

このファイルには、Supabase MCPとStripe MCPで取得した実際のプロジェクト情報が含まれています。

---

## 📊 Supabaseプロジェクト情報

### プロジェクト詳細
- **プロジェクト名**: `spirom`
- **プロジェクトID**: `wofkzcuijycdjwkymgtg`
- **リージョン**: `ap-northeast-1` (東京)
- **ステータス**: `ACTIVE_HEALTHY` ✅
- **PostgreSQLバージョン**: 17.6.1.054
- **作成日**: 2025-12-06

### 接続情報

#### プロジェクトURL
```
https://wofkzcuijycdjwkymgtg.supabase.co
```

#### Anon Key（公開キー）
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZmt6Y3VpanljZGp3a3ltZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODkzNDUsImV4cCI6MjA4MDU2NTM0NX0.cD73blAqo478ju7JJKUg5SH3rKXp3h6OIsiHhzQodlw
```

#### Publishable Key（新形式）
```
sb_publishable_khYEkJ1L7HQboF5EenjPng_1NvZe3aN
```

#### データベースホスト
```
db.wofkzcuijycdjwkymgtg.supabase.co
```

---

## 💳 Stripeアカウント情報

### アカウント詳細
- **表示名**: `New business サンドボックス`
- **アカウントID**: `acct_1RMCjiQTple2GeZD`
- **モード**: テストモード（サンドボックス）

### 作成済みリソース

#### 商品（Stripe）
- **スタンダードプラン**: `prod_TYSrfQiSqQWnqs`
- **プレミアムプラン**: `prod_TYSr3ILommxe9T`

#### 商品（Supabase）
Stripeの商品情報を基に、Supabaseのproductsテーブルに以下の商品を追加しました:

1. **STANDARD PLAN** (一回払い)
   - slug: `standard-onetime`
   - 価格: ¥500
   - タグ: `NEW`
   - Stripe価格ID: `price_1SbLwHQTple2GeZDSAtSHRQe`

2. **PREMIUM PLAN** (一回払い)
   - slug: `premium-onetime`
   - 価格: ¥1,500
   - タグ: `SALE`
   - Stripe価格ID: `price_1SbLwIQTple2GeZDzqHlYMMI`

3. **STANDARD (MONTHLY)** (月額)
   - slug: `standard-monthly`
   - 価格: ¥5,000/月
   - Stripe価格ID: `price_1SbLwJQTple2GeZDl02mKRu6`

4. **PREMIUM (MONTHLY)** (月額)
   - slug: `premium-monthly`
   - 価格: ¥15,000/月
   - Stripe価格ID: `price_1SbLwKQTple2GeZD6KjSe4dl`

すべての商品が`is_featured=true`に設定されており、ホームページに表示されます。

#### 価格
- スタンダード一回払い: `price_1SbLwHQTple2GeZDSAtSHRQe` (¥500)
- プレミアム一回払い: `price_1SbLwIQTple2GeZDzqHlYMMI` (¥1,500)
- スタンダード月額: `price_1SbLwJQTple2GeZDl02mKRu6` (¥5,000/月)
- プレミアム月額: `price_1SbLwKQTple2GeZD6KjSe4dl` (¥15,000/月)

---

## 🔧 環境変数の設定

### apps/api/.env

```env
# サーバー設定
SERVER_PORT=8000
SERVER_HOST=0.0.0.0

# Supabase設定
SUPABASE_URL=https://wofkzcuijycdjwkymgtg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZmt6Y3VpanljZGp3a3ltZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODkzNDUsImV4cCI6MjA4MDU2NTM0NX0.cD73blAqo478ju7JJKUg5SH3rKXp3h6OIsiHhzQodlw

# Service Role Key（管理者権限）
# ⚠️ Supabaseダッシュボードから取得してください
# https://supabase.com/dashboard/project/wofkzcuijycdjwkymgtg/settings/api
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT設定
JWT_SECRET=your-jwt-secret-key-change-this-in-production-32chars-minimum
JWT_EXPIRES_IN=86400

# Stripe設定
# ⚠️ Stripeダッシュボードから取得してください
# https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# ログレベル
RUST_LOG=info,spirom_api=debug
```

### apps/web/.env.local

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BFF_URL=http://localhost:8787

# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://wofkzcuijycdjwkymgtg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZmt6Y3VpanljZGp3a3ltZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODkzNDUsImV4cCI6MjA4MDU2NTM0NX0.cD73blAqo478ju7JJKUg5SH3rKXp3h6OIsiHhzQodlw

# Stripe公開キー
# ⚠️ Stripeダッシュボードから取得してください
# https://dashboard.stripe.com/test/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Stripe価格ID（作成済み）
NEXT_PUBLIC_STRIPE_PRICE_STANDARD_ONETIME=price_1SbLwHQTple2GeZDSAtSHRQe
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ONETIME=price_1SbLwIQTple2GeZDzqHlYMMI
NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY=price_1SbLwJQTple2GeZDl02mKRu6
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_1SbLwKQTple2GeZD6KjSe4dl

# Stripe商品ID（作成済み）
NEXT_PUBLIC_STRIPE_PRODUCT_STANDARD=prod_TYSrfQiSqQWnqs
NEXT_PUBLIC_STRIPE_PRODUCT_PREMIUM=prod_TYSr3ILommxe9T

# Sanity設定
# ⚠️ Sanityダッシュボードから取得してください
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
```

---

## 🔑 取得が必要なキー

以下のキーは手動でダッシュボードから取得する必要があります:

### 1. Supabase Service Role Key

1. https://supabase.com/dashboard/project/wofkzcuijycdjwkymgtg/settings/api にアクセス
2. 「Service Role」セクションの「secret」キーをコピー
3. `apps/api/.env` の `SUPABASE_SERVICE_ROLE_KEY` に設定

### 2. Stripe Secret Key

1. https://dashboard.stripe.com/test/apikeys にアクセス
2. 「Secret key」の「Reveal test key」をクリック
3. `sk_test_` で始まるキーをコピー
4. `apps/api/.env` の `STRIPE_SECRET_KEY` に設定

### 3. Stripe Publishable Key

1. 同じページの「Publishable key」をコピー
2. `pk_test_` で始まるキーをコピー
3. `apps/web/.env.local` の `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` に設定

### 4. Stripe Webhook Secret

1. https://dashboard.stripe.com/test/webhooks にアクセス
2. Webhookエンドポイントを作成（開発時は `stripe listen` を使用）
3. `whsec_` で始まるキーをコピー
4. `apps/api/.env` の `STRIPE_WEBHOOK_SECRET` に設定

---

## 📝 セットアップ手順

```bash
# 1. 依存関係のインストール
cd apps/web
npm install

# 2. 環境変数ファイルを作成（すでに存在する場合はスキップ）
# .env.local ファイルに以下の内容を設定してください

# 3. 開発サーバーを起動
npm run dev
```

### 必要な環境変数

apps/web/.env.local に以下を設定してください:

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://wofkzcuijycdjwkymgtg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZmt6Y3VpanljZGp3a3ltZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODkzNDUsImV4cCI6MjA4MDU2NTM0NX0.cD73blAqo478ju7JJKUg5SH3rKXp3h6OIsiHhzQodlw

# Stripe公開キー（オプション）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

---

## 🔗 ダッシュボードリンク

- **Supabaseプロジェクト**: https://supabase.com/dashboard/project/wofkzcuijycdjwkymgtg
- **Stripe Dashboard**: https://dashboard.stripe.com/test/dashboard
- **Stripe APIキー**: https://dashboard.stripe.com/test/apikeys
- **Stripe Webhook**: https://dashboard.stripe.com/test/webhooks

