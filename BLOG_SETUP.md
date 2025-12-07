# Spiromブログ設定ガイド

このガイドでは、SanityをヘッドレスCMSとして使用したSpiromブログの設定方法を説明します。

## 目次

1. [前提条件](#前提条件)
2. [Sanityプロジェクトのセットアップ](#sanityプロジェクトのセットアップ)
3. [環境変数の設定](#環境変数の設定)
4. [Sanity Studioの起動](#sanity-studioの起動)
5. [サンプルデータの作成](#サンプルデータの作成)
6. [Next.jsアプリケーションの起動](#nextjsアプリケーションの起動)
7. [BFFとの統合](#bffとの統合)

---

## 前提条件

- Node.js 18.x以上
- Sanityアカウント（無料プランで開始可能）
- pnpmパッケージマネージャー

---

## Sanityプロジェクトのセットアップ

### 1. Sanityアカウントの作成

1. [Sanity.io](https://www.sanity.io/)にアクセス
2. 「Get started」をクリックしてアカウントを作成
3. GitHubまたはGoogleアカウントでサインアップ

### 2. 新しいプロジェクトの作成

```bash
cd sanity/studio
pnpm install
pnpm sanity init
```

プロンプトに従って入力:
- **プロジェクト名**: Spirom Blog（または任意の名前）
- **データセット名**: production
- **Output path**: 既存のパスを使用
- **スキーマタイプ**: 既存のスキーマを使用（Clean projectを選択）

### 3. プロジェクトIDの取得

コマンド実行後に表示されるプロジェクトIDをメモしてください。
または、[Sanity管理画面](https://www.sanity.io/manage)で確認できます。

---

## 環境変数の設定

### Next.js Web App

`apps/web/.env.local`ファイルを作成:

```env
# Sanity CMS Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=your-sanity-project-id
NEXT_PUBLIC_SANITY_DATASET=production

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# BFF API Configuration
NEXT_PUBLIC_BFF_URL=http://localhost:8787
```

### Sanity Studio

`sanity/studio/.env.local`ファイルを作成:

```env
SANITY_STUDIO_PROJECT_ID=your-sanity-project-id
SANITY_STUDIO_DATASET=production
```

**重要**: `your-sanity-project-id`を実際のプロジェクトIDに置き換えてください。

---

## Sanity Studioの起動

```bash
cd sanity/studio
pnpm dev
```

ブラウザで`http://localhost:3333`にアクセスし、Sanity Studioを開きます。

初回起動時にCORSの設定が必要な場合があります。Sanity管理画面で以下のオリジンを追加:
- `http://localhost:3333`
- `http://localhost:3000`

---

## サンプルデータの作成

Sanity Studioで以下のコンテンツを作成します。

### 1. カテゴリの作成

左サイドバーから「カテゴリ」を選択し、以下のカテゴリを作成:

| タイトル | スラッグ | カラーコード | 表示順 |
|---------|---------|------------|-------|
| ライフスタイル | lifestyle | #FF6B6B | 1 |
| インテリア | interior | #4ECDC4 | 2 |
| キッチン | kitchen | #FFE66D | 3 |
| 特集 | featured | #A8E6CF | 4 |

### 2. 著者の作成

左サイドバーから「著者」を選択し、以下の著者を作成:

- **名前**: Spiromスタッフ
- **スラッグ**: spirom-staff（自動生成）
- **プロフィール**: 暮らしを豊かにする商品を厳選してお届けするSpiromチーム
- **アクティブ**: ✓

### 3. ブログ記事の作成

左サイドバーから「ブログ記事」を選択し、サンプル記事を作成:

#### 記事1: サステナブルな暮らしを始めよう

- **タイトル**: サステナブルな暮らしを始めよう
- **スラッグ**: sustainable-living（自動生成）
- **メイン画像**: 任意の画像をアップロード
- **抜粋**: 環境に優しい選択が、心地よい暮らしにつながります。日常でできる小さな一歩から始めてみませんか。
- **公開日**: 今日の日付
- **著者**: Spiromスタッフ
- **カテゴリ**: ライフスタイル
- **本文**: 
  ```
  ## はじめに
  
  サステナブルな暮らしは、難しく考える必要はありません。日々の小さな選択の積み重ねが、大きな変化を生み出します。
  
  ## できることから始めよう
  
  - エコバッグを持ち歩く
  - マイボトルを使う
  - 地元の食材を選ぶ
  - 長く使える質の良いものを選ぶ
  
  ## まとめ
  
  持続可能な暮らしは、私たち一人ひとりの意識から始まります。
  ```
- **タグ**: サステナブル, エコ, ライフスタイル
- **注目記事**: ✓
- **SEO用タイトル**: サステナブルな暮らしを始めよう | Spirom
- **SEO用ディスクリプション**: 環境に優しい選択で心地よい暮らしを実現。日常でできるサステナブルな取り組みをご紹介します。

#### 記事2: 整理整頓で心もスッキリ

同様の手順で、他のカテゴリの記事も作成してください。

---

## Next.jsアプリケーションの起動

```bash
cd apps/web
pnpm install
pnpm dev
```

ブラウザで`http://localhost:3000/blog`にアクセスし、ブログページを確認します。

---

## BFFとの統合

BFFでSanityデータを使用する場合:

### 1. Wrangler環境変数の設定

`apps/bff/wrangler.toml`に以下を追加:

```toml
[vars]
SANITY_PROJECT_ID = "your-sanity-project-id"
SANITY_DATASET = "production"
SANITY_API_VERSION = "2024-01-01"
```

### 2. BFFの起動

```bash
cd apps/bff
cargo install worker-build
pnpm dev
```

---

## スキーマ構造

### Post（ブログ記事）

| フィールド | タイプ | 必須 | 説明 |
|----------|-------|-----|------|
| title | string | ✓ | 記事タイトル |
| slug | slug | ✓ | URL用スラッグ |
| mainImage | image | ✓ | アイキャッチ画像 |
| excerpt | text | | 記事の抜粋（200文字まで） |
| publishedAt | datetime | ✓ | 公開日時 |
| author | reference | | 著者への参照 |
| category | reference | | カテゴリへの参照 |
| body | blockContent | ✓ | 記事本文 |
| featured | boolean | | 注目記事フラグ |
| tags | array[string] | | タグ配列 |
| seoTitle | string | | SEO用タイトル（60文字まで） |
| seoDescription | text | | SEO用説明文（160文字まで） |

### Author（著者）

| フィールド | タイプ | 必須 | 説明 |
|----------|-------|-----|------|
| name | string | ✓ | 著者名 |
| slug | slug | | URL用スラッグ |
| image | image | | プロフィール画像 |
| bio | text | | 自己紹介 |
| email | string | | メールアドレス |
| socialLinks | object | | SNSリンク集 |
| active | boolean | | アクティブ状態 |

### Category（カテゴリ）

| フィールド | タイプ | 必須 | 説明 |
|----------|-------|-----|------|
| title | string | ✓ | カテゴリ名 |
| slug | slug | ✓ | URL用スラッグ |
| description | text | | カテゴリ説明 |
| image | image | | カテゴリ画像 |
| parent | reference | | 親カテゴリへの参照 |
| sortOrder | number | | 表示順序 |
| color | string | | ブランドカラー（#RRGGBB形式） |
| seoTitle | string | | SEO用タイトル |
| seoDescription | text | | SEO用説明文 |

---

## トラブルシューティング

### プロジェクトIDが見つからない

[Sanity管理画面](https://www.sanity.io/manage)にログインし、プロジェクト一覧から該当のプロジェクトを選択してIDを確認してください。

### CORSエラーが発生する

Sanity管理画面の「API」セクションで、適切なオリジン（`http://localhost:3000`など）を追加してください。

### データが表示されない

1. Sanity Studioでデータが公開されているか確認
2. 環境変数が正しく設定されているか確認
3. ブラウザのコンソールでエラーメッセージを確認

---

## 本番環境へのデプロイ

### Sanity Studioのデプロイ

```bash
cd sanity/studio
pnpm sanity deploy
```

スタジオホスト名を入力すると、`https://your-studio-name.sanity.studio`でアクセス可能になります。

### Next.jsアプリのデプロイ

Vercelなどのホスティングサービスで環境変数を設定:

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SITE_URL`

---

## 参考リンク

- [Sanity Documentation](https://www.sanity.io/docs)
- [GROQ Query Language](https://www.sanity.io/docs/groq)
- [Next.js Documentation](https://nextjs.org/docs)
- [Portable Text](https://www.sanity.io/docs/presenting-block-text)

---

## サポート

質問やバグ報告は、プロジェクトのIssueトラッカーにお願いします。

