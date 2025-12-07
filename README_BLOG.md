# Spirom Blog Setup - Quick Start

このドキュメントは、Sanity CMSを使用したブログ機能のクイックスタートガイドです。

## 必要なもの

- Node.js 18以上
- Sanityアカウント（無料）
- pnpmパッケージマネージャー

## セットアップ手順

### 1. Sanityプロジェクトの作成

```bash
cd sanity/studio
pnpm install

# Sanity CLIでプロジェクトを初期化
pnpm sanity init

# プロンプトに従って入力:
# - Project name: Spirom Blog
# - Dataset: production
# - Schema: 既存のスキーマを使用（Clean projectを選択）
```

### 2. 環境変数の設定

#### Next.js Web App (`apps/web/.env.local`)

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id-here
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BFF_URL=http://localhost:8787
```

#### Sanity Studio (`sanity/studio/.env.local`)

```env
SANITY_STUDIO_PROJECT_ID=your-project-id-here
SANITY_STUDIO_DATASET=production
```

#### BFF (`apps/bff/wrangler.toml`)

```toml
[vars]
SANITY_PROJECT_ID = "your-project-id-here"
SANITY_DATASET = "production"
SITE_URL = "http://localhost:3000"
```

**重要**: `your-project-id-here`を実際のSanityプロジェクトIDに置き換えてください。

### 3. Sanity Studioの起動

```bash
cd sanity/studio
pnpm dev
```

ブラウザで `http://localhost:3333` にアクセスします。

### 4. サンプルデータの作成

#### 方法1: スクリプトで自動作成（推奨）

Sanity APIトークンを取得:
1. [Sanity管理画面](https://www.sanity.io/manage) にアクセス
2. プロジェクトを選択 → API → Tokens
3. 「Add API token」をクリック
4. Editor権限を持つトークンを作成

環境変数を設定:
```bash
export SANITY_API_TOKEN=your-token-here
```

スクリプトを実行:
```bash
cd sanity/studio
pnpm create-sample-data
```

#### 方法2: Sanity Studioから手動作成

詳細は `BLOG_SETUP.md` を参照してください。

### 5. Next.jsアプリの起動

```bash
cd apps/web
pnpm install
pnpm dev
```

ブラウザで `http://localhost:3000/blog` にアクセスします。

### 6. BFFの起動（オプション）

```bash
cd apps/bff
pnpm dev
```

BFF経由でブログデータにアクセス: `http://localhost:8787/bff/v1/blog`

## 実装された機能

### ✅ Sanity スキーマ

- **Post（ブログ記事）**: タイトル、本文、画像、SEO設定、タグなど
- **Author（著者）**: 名前、プロフィール、SNSリンク
- **Category（カテゴリ）**: 階層構造、カラー設定、SEO設定
- **Block Content（リッチテキスト）**: 見出し、画像、コード、リンクなど

### ✅ Next.js 統合

- **ブログ一覧ページ**: `/app/blog/page.tsx`
  - Sanityからデータ取得
  - カテゴリフィルター
  - ISR対応（60秒キャッシュ）
  
- **記事詳細ページ**: `/app/blog/[slug]/page.tsx`
  - 動的ルーティング
  - SSG/ISR対応
  - Portable Text表示
  - 関連記事表示
  - SEO最適化（メタタグ、JSON-LD）

### ✅ BFF 統合

- **エンドポイント**:
  - `GET /bff/v1/blog` - ブログ一覧
  - `GET /bff/v1/blog/{slug}` - 記事詳細
  - `GET /sitemap-blog.xml` - ブログサイトマップ

- **機能**:
  - キャッシュ対応
  - レート制限
  - エラーハンドリング
  - SEO最適化

### ✅ サンプルデータ作成スクリプト

- `sanity/studio/scripts/createSampleData.ts`
- カテゴリ4件、著者2名、記事4件を自動作成

## ディレクトリ構造

```
spirom/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/blog/          # ブログページ
│   │   │   └── lib/sanity.ts      # Sanityクライアント
│   │   └── .env.local              # 環境変数（作成必要）
│   └── bff/
│       ├── src/
│       │   ├── handlers/bff.rs     # ブログエンドポイント
│       │   └── services/
│       │       ├── sanity_client.rs  # Sanityクライアント
│       │       └── aggregator.rs     # データ集約
│       └── wrangler.toml           # 環境変数設定
├── sanity/
│   └── studio/
│       ├── schemas/                # CMSスキーマ定義
│       │   ├── post.ts
│       │   ├── author.ts
│       │   ├── category.ts
│       │   └── blockContent.ts
│       ├── scripts/
│       │   └── createSampleData.ts # サンプルデータ作成
│       ├── sanity.config.ts        # Studio設定
│       └── .env.local              # 環境変数（作成必要）
├── BLOG_SETUP.md                   # 詳細セットアップガイド
└── README_BLOG.md                  # このファイル
```

## 主な技術スタック

- **CMS**: Sanity.io
- **フロントエンド**: Next.js 15 (App Router)
- **BFF**: Rust + Cloudflare Workers
- **キャッシュ**: Cloudflare KV
- **画像変換**: Sanity Image URLs
- **コンテンツ表示**: Portable Text

## 開発ワークフロー

1. Sanity Studioで記事を作成・編集
2. Next.jsアプリが自動的にデータを取得（ISR）
3. 本番環境では、Webhookで再検証をトリガー可能

## トラブルシューティング

### プロジェクトIDが見つからない

[Sanity管理画面](https://www.sanity.io/manage)でプロジェクトIDを確認してください。

### CORSエラー

Sanity管理画面の「API」セクションで、以下のオリジンを追加:
- `http://localhost:3000`
- `http://localhost:3333`

### データが表示されない

1. Sanity Studioでデータが作成されているか確認
2. 環境変数が正しく設定されているか確認
3. ブラウザのコンソールでエラーを確認

## 本番環境デプロイ

### Sanity Studio

```bash
cd sanity/studio
pnpm sanity deploy
```

### Next.js (Vercel)

環境変数を設定:
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SITE_URL`

### BFF (Cloudflare Workers)

```bash
cd apps/bff
wrangler publish
```

## 参考リンク

- [Sanity Documentation](https://www.sanity.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [GROQ Query Language](https://www.sanity.io/docs/groq)
- [詳細セットアップガイド](./BLOG_SETUP.md)

## サポート

質問やバグ報告は、プロジェクトのIssueトラッカーにお願いします。

