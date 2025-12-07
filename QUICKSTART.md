# Spirom クイックスタート

最速で起動する手順です。

## ⚡ 3ステップで起動

### 1️⃣ 環境変数の設定

```bash
# API用
cp apps/api/.env.example apps/api/.env
# apps/api/.env を編集してSupabaseとStripeのキーを設定

# フロントエンド用
cp apps/web/.env.example apps/web/.env.local
# apps/web/.env.local を編集してStripe公開キーを設定
```

### 2️⃣ 依存関係のインストール

```bash
npm install
```

### 3️⃣ 起動（3つのターミナル）

```bash
# ターミナル1: バックエンドAPI
cd apps/api
cargo run

# ターミナル2: BFF
cd apps/bff
npx wrangler dev

# ターミナル3: フロントエンド
npm run dev:web
```

## ✅ 確認

- **API**: http://localhost:8000/health
- **BFF**: http://localhost:8787/health
- **Web**: http://localhost:3000

**重要:** 3つとも起動していないとフロントエンドが正常に動作しません。

---

詳細な手順は [STARTUP_GUIDE.md](./STARTUP_GUIDE.md) を参照してください。

