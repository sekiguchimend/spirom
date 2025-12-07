# Sanityブログ セットアップチェックリスト

このチェックリストを使って、ブログ機能の設定状況を確認してください。

## ✅ 基本セットアップ

- [ ] Sanityアカウントを作成
- [ ] Sanity CLIでプロジェクトを初期化 (`pnpm sanity init`)
- [ ] プロジェクトIDを取得

## ✅ 環境変数の設定

### Next.js Web App

- [ ] `apps/web/.env.local` ファイルを作成
- [ ] `NEXT_PUBLIC_SANITY_PROJECT_ID` を設定
- [ ] `NEXT_PUBLIC_SANITY_DATASET=production` を設定
- [ ] `NEXT_PUBLIC_SITE_URL` を設定

### Sanity Studio

- [ ] `sanity/studio/.env.local` ファイルを作成
- [ ] `SANITY_STUDIO_PROJECT_ID` を設定
- [ ] `SANITY_STUDIO_DATASET=production` を設定

### BFF（オプション）

- [ ] `apps/bff/wrangler.toml` に `SANITY_PROJECT_ID` を追加
- [ ] `apps/bff/wrangler.toml` に `SANITY_DATASET` を追加

## ✅ データの準備

### 自動作成（推奨）

- [ ] Sanity APIトークンを取得（Editor権限）
- [ ] 環境変数 `SANITY_API_TOKEN` を設定
- [ ] `pnpm create-sample-data` を実行

### 手動作成

- [ ] カテゴリを4件作成（ライフスタイル、インテリア、キッチン、特集）
- [ ] 著者を作成（Spiromスタッフ）
- [ ] ブログ記事を作成（最低1件）

## ✅ 動作確認

- [ ] Sanity Studio (`http://localhost:3333`) が起動する
- [ ] Sanity Studioでデータが表示される
- [ ] Next.jsアプリ (`http://localhost:3000`) が起動する
- [ ] `/blog` ページでブログ一覧が表示される
- [ ] 記事詳細ページが表示される
- [ ] 画像が正しく表示される

## ✅ SEO設定

- [ ] 記事にSEOタイトルを設定
- [ ] 記事にSEOディスクリプションを設定
- [ ] カテゴリにSEO設定を追加
- [ ] OGP画像が設定されている

## ✅ BFF統合（オプション）

- [ ] BFF (`http://localhost:8787`) が起動する
- [ ] `/bff/v1/blog` でブログ一覧が取得できる
- [ ] `/bff/v1/blog/{slug}` で記事詳細が取得できる
- [ ] `/sitemap-blog.xml` でサイトマップが生成される

## 🚀 本番環境デプロイ

### Sanity Studio

- [ ] `pnpm sanity deploy` でStudioをデプロイ
- [ ] 本番用のCORSオリジンを設定

### Next.js

- [ ] Vercelなどのホスティングサービスにデプロイ
- [ ] 本番環境の環境変数を設定
- [ ] ISR/キャッシュが正しく動作する

### BFF

- [ ] `wrangler publish` でデプロイ
- [ ] 本番環境の環境変数を設定
- [ ] APIエンドポイントが正しく動作する

## 📝 追加設定（オプション）

- [ ] Webhookを設定してISRを自動トリガー
- [ ] Sanity Studioのカスタマイズ
- [ ] 著者ページの実装
- [ ] タグページの実装
- [ ] 検索機能の実装
- [ ] コメント機能の追加

## 🎨 デザインカスタマイズ

- [ ] ブログ一覧のレイアウト調整
- [ ] 記事詳細のスタイリング調整
- [ ] カテゴリバッジのカラー設定
- [ ] モバイル対応の確認

## 📊 分析とモニタリング

- [ ] Google Analyticsの設定
- [ ] エラートラッキングの設定
- [ ] パフォーマンスモニタリング

---

## トラブルシューティング

問題が発生した場合は、以下を確認してください:

1. **データが表示されない**
   - [ ] 環境変数が正しく設定されているか
   - [ ] Sanityでデータが公開されているか
   - [ ] ブラウザコンソールでエラーを確認

2. **画像が表示されない**
   - [ ] 画像がSanityにアップロードされているか
   - [ ] 画像URLが正しく生成されているか
   - [ ] CORSの設定が正しいか

3. **ビルドエラー**
   - [ ] すべての依存関係がインストールされているか
   - [ ] TypeScript型エラーがないか
   - [ ] 環境変数が設定されているか

---

## 完了!

すべてのチェックボックスにチェックが入ったら、ブログシステムの設定は完了です! 🎉

詳細な情報は以下を参照してください:
- [README_BLOG.md](./README_BLOG.md) - クイックスタートガイド
- [BLOG_SETUP.md](./BLOG_SETUP.md) - 詳細セットアップガイド

