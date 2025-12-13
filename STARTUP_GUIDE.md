# Spirom 起動手順

## 📋 前提条件

### 必要なツール
- **Node.js** 18以上
- **Rust** 1.70以上
- **npm** 10以上
- **Supabase** アカウント
- **Stripe** アカウント（テストモード）

### 確認コマンド
```bash
node --version    # v18以上
npm --version     # v10以上
cargo --version   # 1.70以上
```

---

## 🚀 初回セットアップ

### 1. リポジトリのクローン

```bash
cd ~/Downloads
# すでにダウンロード済み
cd spirom
```

### 2. 依存関係のインストール

```bash
# ルートディレクトリで実行
npm install
```

これにより、以下のワークスペースの依存関係がインストールされます：
- `apps/web` - Next.jsフロントエンド
- `sanity/studio` - Sanity Studio
- `packages/ui` - 共通UIコンポーネント

---

## 🔧 環境変数の設定

### テンプレートファイルを使用する場合

```bash
# API用
cp apps/api/.env.example apps/api/.env

# フロントエンド用  
cp apps/web/.env.local.example apps/web/.env.local

# 各ファイルを編集して実際のキーを設定
```

### 1. API用環境変数 (`apps/api/.env`)

```bash
# apps/api/.env ファイルを作成
cd apps/api
```

以下の内容で `.env` ファイルを作成:

```env
# サーバー設定
PORT=8000
HOST=0.0.0.0

# Supabase設定
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SUPABASE_SERVICE_ROLE_KEY>

# JWT設定
JWT_SECRET=your-jwt-secret-key-change-this-in-production
JWT_ACCESS_EXPIRY=3600       # アクセストークン（秒）
JWT_REFRESH_EXPIRY=2592000   # リフレッシュトークン（秒、例: 30日）

# デバッグ（原因特定用: Supabaseのエラー本文をレスポンスに含める）
API_DEBUG_ERRORS=1
ENVIRONMENT=local

# Stripe設定（テストモード）
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# ログレベル
RUST_LOG=info,spirom_api=debug
```

### 2. フロントエンド用環境変数 (`apps/web/.env.local`)

```bash
cd apps/web
```

以下の内容で `.env.local` ファイルを作成:

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BFF_URL=http://localhost:8787

# Stripe公開キー（テストモード）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# ⚠️ 注意: StripeのPrice ID / Product ID を `NEXT_PUBLIC_*` に置かないでください。
# クライアント公開すると不正購入や改ざんの足がかりになります。
# 本実装ではDB上の商品ID + サーバー側の金額確定（/api/v1/orders → /api/v1/payments/intent）を使用します。

# Sanity設定
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
```

### 3. Sanity Studio用環境変数 (オプション)

Sanity Studioは `sanity.config.ts` で設定済みです。

---

## 🎯 各サービスの起動

### パターン1: すべてのサービスを同時起動（推奨）

**4つのターミナルが必要です:**

```bash
# ターミナル1: バックエンドAPI (Rust)
cd apps/api
cargo run

# ターミナル2: BFF (Cloudflare Workers - Rust)
cd apps/bff
npx wrangler dev

# ターミナル3: フロントエンド (Next.js)
npm run dev:web

# ターミナル4: Sanity Studio (オプション)
npm run dev:sanity
```

### パターン2: 個別に起動

#### 1. バックエンドAPI (apps/api)

```bash
cd apps/api
cargo run
```

**起動確認:**
- URL: http://localhost:8000
- ヘルスチェック: http://localhost:8000/health

**ログ例:**
```
INFO spirom_api: Configuration loaded
INFO spirom_api: Connecting to Supabase at https://xxx.supabase.co
INFO spirom_api: Connected to Supabase
INFO spirom_api: Starting server on 0.0.0.0:8000
```

#### 2. BFF - Backend for Frontend (apps/bff)

```bash
cd apps/bff
npx wrangler dev
```

**起動確認:**
- URL: http://localhost:8787
- ヘルスチェック: http://localhost:8787/health

**ログ例:**
```
⛅️ wrangler 3.x.x
------------------
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

**重要:** BFFはフロントエンドとAPIの間の集約レイヤーです。起動必須です。

#### 3. フロントエンド (apps/web)

```bash
npm run dev:web
# または
cd apps/web
npm run dev
```

**起動確認:**
- URL: http://localhost:3000

**ログ例:**
```
  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.3s
```

#### 4. Sanity Studio (sanity/studio) - オプション

```bash
npm run dev:sanity
# または
cd sanity/studio
npm run dev
```

**起動確認:**
- URL: http://localhost:3333

---

## ✅ 起動確認

すべてのサービスが起動していることを確認します:

### 1. バックエンドAPI

```bash
curl http://localhost:8000/health
# 期待: {"status":"ok","timestamp":"2024-01-01T00:00:00Z"}
```

### 2. BFF

```bash
curl http://localhost:8787/health
# 期待: {"status":"ok"}
```

### 3. フロントエンド

ブラウザで http://localhost:3000 を開く

### 4. 決済機能のテスト

```bash
# 支払いリンクで直接テスト（ブラウザで開く）
# スタンダードプラン
https://buy.stripe.com/test_9B6cN7bhg5mL9VXepFgjC00

# テストカード番号
4242 4242 4242 4242
有効期限: 任意の未来の日付
CVC: 任意の3桁
```

---

## 📦 BFF用の追加設定

BFFはCloudflare Workersで動作します。開発時は特別な設定は不要ですが、以下を確認:

### 必要なツール

```bash
# Wranglerがインストールされているか確認
npx wrangler --version

# worker-buildをインストール（初回のみ）
cargo install worker-build
```

### BFF環境変数（wrangler.toml）

開発時は`wrangler.toml`の`[env.development]`が使用されます:

```toml
[env.development]
name = "spirom-bff-dev"
vars = { 
  ENVIRONMENT = "development", 
  API_BASE_URL = "http://localhost:8000"  # ← APIのURLを指定
}
```

## 🔥 トラブルシューティング

### エラー: "BFF connection refused"

**原因:** BFFが起動していない、またはポート8787が使用中

**解決策:**
```bash
# BFFを起動
cd apps/bff
npx wrangler dev

# ポート確認
netstat -ano | findstr :8787  # Windows
lsof -i :8787                 # Mac/Linux
```

### エラー: "worker-build not found"

**原因:** worker-buildがインストールされていない

**解決策:**
```bash
cargo install worker-build
```

### エラー: "Supabase connection failed"

**原因:** 環境変数が設定されていない、または間違っている

**解決策:**
1. `apps/api/.env` を確認
2. Supabase URLとAnon Keyが正しいか確認
3. Supabaseプロジェクトが起動しているか確認

### エラー: "STRIPE_SECRET_KEY not found"

**原因:** Stripe環境変数が設定されていない

**解決策:**
1. `apps/api/.env` に `STRIPE_SECRET_KEY` を追加
2. Stripeダッシュボードからテストキーを取得

### エラー: "Port 8000 already in use"

**原因:** ポート8000が既に使用されている

**解決策:**
```bash
# 既存のプロセスを確認
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Mac/Linux

# プロセスを終了するか、別のポートを使用
# apps/api/.env で PORT を変更
PORT=8001
```

### エラー: "Next.js build failed"

**原因:** Node.jsモジュールが正しくインストールされていない

**解決策:**
```bash
# キャッシュをクリアして再インストール
cd apps/web
rm -rf node_modules .next
npm install
npm run dev
```

---

## 📊 ポート一覧

| サービス | ポート | URL | 必須 |
|---------|--------|-----|------|
| **バックエンドAPI** | 8000 | http://localhost:8000 | ✅ 必須 |
| **BFF** | 8787 | http://localhost:8787 | ✅ 必須 |
| **フロントエンド** | 3000 | http://localhost:3000 | ✅ 必須 |
| Sanity Studio | 3333 | http://localhost:3333 | オプション |

---

## 🛠️ 開発コマンド一覧

### ルートディレクトリ

```bash
npm run dev          # Web + Sanityを起動（Turbo使用）
                     # ⚠️ API と BFF は別途起動が必要
npm run build        # すべてをビルド
npm run lint         # すべてをリント
npm run dev:web      # フロントエンドのみ起動
npm run dev:sanity   # Sanity Studioのみ起動
```

### バックエンドAPI (apps/api)

```bash
cargo run            # 開発サーバー起動
cargo build          # ビルド
cargo test           # テスト実行
cargo fmt            # フォーマット
cargo clippy         # Lintチェック
```

### BFF (apps/bff)

```bash
npx wrangler dev     # 開発サーバー起動（ポート8787）
npx wrangler deploy  # デプロイ
cargo build          # ビルド
cargo test           # テスト実行
```

### フロントエンド (apps/web)

```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm run start        # プロダクションサーバー起動
npm run lint         # ESLint実行
```

---

## 🎬 初回起動の完全手順（まとめ）

```bash
# 1. 依存関係インストール
npm install

# 2. 環境変数ファイル作成
# apps/api/.env を作成（上記の例を参照）
# apps/web/.env.local を作成（上記の例を参照）

# 3. バックエンドAPI起動（ターミナル1）
cd apps/api
cargo run

# 4. BFF起動（ターミナル2）
cd apps/bff
npx wrangler dev

# 5. フロントエンド起動（ターミナル3）
npm run dev:web

# 6. ブラウザで確認
# http://localhost:3000
```

**重要:** 3つのサービス（API、BFF、Web）すべてが起動している必要があります。

---

## 📚 次のステップ

起動が成功したら:

1. **データベースのセットアップ**
   - Supabaseで必要なテーブルを作成
   - サンプルデータの投入

2. **Stripe決済のテスト**
   - テストカードで決済フローを確認
   - Webhookの動作確認

3. **Sanity CMSのセットアップ**
   - ブログ記事の作成
   - カテゴリの設定

詳細は各ドキュメントを参照:
- [STRIPE_GUIDE.md](./STRIPE_GUIDE.md) - Stripe決済ガイド
- [SANITY_SETUP_QUICKSTART.md](./SANITY_SETUP_QUICKSTART.md) - Sanityセットアップ
- [BLOG_SETUP.md](./BLOG_SETUP.md) - ブログ機能セットアップ

