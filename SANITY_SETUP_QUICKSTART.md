# 🚀 Sanity Studio クイックスタート

## ❌ エラーの原因

```
ERROR: command (C:\Users\sekig\Downloads\spirom\sanity\studio) C:\Program Files\nodejs\npm.cmd run dev exited (1)
```

**原因**: Sanity Studioに必要な環境変数が設定されていません。

---

## ✅ 解決方法

### 方法1: ブログ機能を使用する場合（Sanityプロジェクトを作成）

#### ステップ1: Sanityアカウント作成とログイン

```powershell
cd sanity\studio
npx sanity login
```

ブラウザが開くので、GoogleまたはGitHubアカウントでログインしてください。

#### ステップ2: Sanityプロジェクトを初期化

```powershell
npx sanity init
```

プロンプトに従って入力:
- **Create new project?**: Yes
- **Project name**: `Spirom Blog` (任意の名前)
- **Use the default dataset configuration?**: Yes
- **Project output path**: `.` (現在のディレクトリ)
- **Select project template**: Clean project with no predefined schemas

#### ステップ3: プロジェクトIDを確認

コマンド実行後に表示される **Project ID** をメモしてください。

例: `abc123xyz`

#### ステップ4: 環境変数ファイルを作成

`sanity/studio/.env.local` を作成して以下を記述:

```env
SANITY_STUDIO_PROJECT_ID=abc123xyz
SANITY_STUDIO_DATASET=production
```

`apps/web/.env.local` を作成して以下を記述:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=abc123xyz
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BFF_URL=http://localhost:8787
```

**重要**: `abc123xyz` を実際のプロジェクトIDに置き換えてください。

#### ステップ5: Sanity Studioを起動

```powershell
cd sanity\studio
npm run dev
```

ブラウザで `http://localhost:3333` にアクセスして、Sanity Studioを開きます。

---

### 方法2: ブログ機能を今は使わない場合（暫定対応）

ブログ機能をまだ使用しない場合は、ダミーの環境変数を設定してエラーを回避できます。

#### `sanity/studio/.env.local` を作成:

```env
SANITY_STUDIO_PROJECT_ID=dummy-project-id
SANITY_STUDIO_DATASET=production
```

#### `apps/web/.env.local` を作成:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=dummy-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

この設定では、Sanity Studioは起動しますが、実際のデータ取得はできません。

**注意**: ブログページにアクセスすると「記事がありません」と表示されます。

---

## 🎯 起動確認

### 全体を起動（turboコマンド）

ルートディレクトリで:

```powershell
npm run dev
```

または、個別に起動:

```powershell
# Web アプリ
cd apps\web
npm run dev

# Sanity Studio (Sanityセットアップ後)
cd sanity\studio
npm run dev

# API (Rust)
cd apps\api
cargo run

# BFF (Rust + Cloudflare Workers)
cd apps\bff
npm run dev
```

---

## 📚 関連ドキュメント

- 詳細なセットアップ手順: `BLOG_SETUP.md`
- ブログチェックリスト: `BLOG_CHECKLIST.md`
- Sanity公式ドキュメント: https://www.sanity.io/docs

---

## 🆘 トラブルシューティング

### 「Project ID not found」エラー

- Sanity管理画面（https://www.sanity.io/manage）でプロジェクトIDを確認
- `.env.local` ファイルが正しい場所にあるか確認
- ファイル内のスペースや改行に注意

### CORSエラー

Sanity管理画面の「API」→「CORS Origins」で以下を追加:
- `http://localhost:3000`
- `http://localhost:3333`

### データが表示されない

1. Sanity Studioでコンテンツが公開されているか確認
2. `publishedAt` の日付が未来になっていないか確認
3. ブラウザのコンソールでエラーを確認

---

## 次のステップ

1. ✅ 環境変数を設定
2. ✅ Sanity Studioを起動
3. 📝 カテゴリを作成（`BLOG_SETUP.md` 参照）
4. 📝 著者を作成
5. 📝 ブログ記事を作成
6. 🎨 Next.jsアプリでブログページを確認

---

**成功を祈っています！** 🎉

