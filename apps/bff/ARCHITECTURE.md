# Spirom BFF (Backend for Frontend) アーキテクチャ設計書

## 1. 概要

### 1.1 目的
- **SEO最適化**: エッジでのSSR/ISR最適化、構造化データ生成
- **高速化**: WebAssembly + Cloudflare Workers によるエッジ処理
- **堅牢性**: 型安全性、レート制限、セキュリティヘッダー

### 1.2 技術スタック

| レイヤー | 技術 |
|----------|------|
| エッジランタイム | Cloudflare Workers |
| 言語 | Rust → WebAssembly |
| キャッシュ | Cloudflare KV, Cache API |
| 静的アセット | Cloudflare R2 |

## 2. アーキテクチャ図

```
                                    ┌─────────────────────────────────────┐
                                    │         Cloudflare Edge             │
┌──────────┐                        │  ┌─────────────────────────────┐    │
│  Client  │◄──────────────────────►│  │   BFF (Rust/WASM Workers)   │    │
│ (Browser)│        CDN             │  │                             │    │
└──────────┘                        │  │  ┌─────────────────────┐    │    │
                                    │  │  │  Request Router     │    │    │
                                    │  │  └──────────┬──────────┘    │    │
                                    │  │             │               │    │
                                    │  │  ┌─────────▼─────────┐     │    │
                                    │  │  │  Middleware Stack  │     │    │
                                    │  │  │  - Auth Check      │     │    │
                                    │  │  │  - Rate Limiter    │     │    │
                                    │  │  │  - Cache Check     │     │    │
                                    │  │  │  - Security Headers│     │    │
                                    │  │  └─────────┬─────────┘     │    │
                                    │  │            │                │    │
                                    │  │  ┌────────▼────────┐       │    │
                                    │  │  │  Service Layer   │       │    │
                                    │  │  │  - SEO Optimizer │       │    │
                                    │  │  │  - Data Aggregator│      │    │
                                    │  │  │  - JSON-LD Gen   │       │    │
                                    │  │  └────────┬────────┘       │    │
                                    │  │           │                 │    │
                                    │  └───────────┼─────────────────┘    │
                                    │              │                      │
                                    │  ┌───────────▼───────────┐          │
                                    │  │    Cloudflare KV      │          │
                                    │  │    (Edge Cache)       │          │
                                    │  └───────────────────────┘          │
                                    └──────────────┬──────────────────────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              │                    │                    │
                    ┌─────────▼─────────┐ ┌───────▼───────┐ ┌─────────▼─────────┐
                    │   API Backend     │ │  Sanity CMS   │ │   Cloudflare R2   │
                    │   (Rust/Axum)     │ │   (Blog)      │ │   (Assets)        │
                    └───────────────────┘ └───────────────┘ └───────────────────┘
```

## 3. BFF機能

### 3.1 SEO最適化

| 機能 | 説明 |
|------|------|
| 構造化データ生成 | Product, BreadcrumbList, Organization等のJSON-LD自動生成 |
| メタタグ最適化 | OGP, Twitter Card, canonical URL自動設定 |
| sitemap.xml | 動的生成 + エッジキャッシュ |
| robots.txt | 動的生成 |
| Core Web Vitals | LCP, FID, CLS最適化のためのリソースヒント |

### 3.2 高速化

| 機能 | 説明 |
|------|------|
| エッジキャッシュ | KVによるAPIレスポンスキャッシュ |
| Stale-While-Revalidate | バックグラウンド更新 |
| データ集約 | 複数APIコールの並列実行・集約 |
| 圧縮 | Brotli/gzip圧縮 |
| Early Hints | 103レスポンスでリソースプリロード |

### 3.3 セキュリティ

| 機能 | 説明 |
|------|------|
| レート制限 | IP/ユーザーベースのスロットリング |
| CSRF保護 | トークン検証 |
| セキュリティヘッダー | CSP, HSTS, X-Frame-Options等 |
| Bot検出 | 悪意あるボットのブロック |
| DDoS防御 | Cloudflare統合 |

## 4. エンドポイント設計

### 4.1 SEO用エンドポイント

| パス | 説明 | キャッシュ |
|------|------|----------|
| /sitemap.xml | サイトマップ | 1時間 |
| /sitemap-products.xml | 商品サイトマップ | 1時間 |
| /sitemap-blog.xml | ブログサイトマップ | 1時間 |
| /robots.txt | robots.txt | 24時間 |
| /.well-known/security.txt | セキュリティポリシー | 24時間 |

### 4.2 BFF用エンドポイント

| パス | 説明 | キャッシュ |
|------|------|----------|
| /bff/v1/home | ホームページデータ | 5分 |
| /bff/v1/products/:slug | 商品詳細 + 関連データ | 1分 |
| /bff/v1/categories/:slug | カテゴリ + 商品一覧 | 5分 |
| /bff/v1/blog/:slug | ブログ記事 + 関連記事 | 1分 |
| /bff/v1/search | 検索結果 | 30秒 |

## 5. キャッシュ戦略

### 5.1 キャッシュレイヤー

```
┌─────────────────────────────────────────────────────────┐
│                    Cache Hierarchy                       │
├─────────────────────────────────────────────────────────┤
│  L1: Browser Cache    │ max-age, immutable              │
├───────────────────────┼─────────────────────────────────┤
│  L2: Cloudflare CDN   │ s-maxage, stale-while-revalidate│
├───────────────────────┼─────────────────────────────────┤
│  L3: Cloudflare KV    │ アプリケーションキャッシュ       │
├───────────────────────┼─────────────────────────────────┤
│  L4: Origin           │ Redis/メモリキャッシュ           │
└───────────────────────┴─────────────────────────────────┘
```

### 5.2 キャッシュキー設計

```
bff:home:v1
bff:product:{slug}:v1
bff:category:{slug}:page:{n}:v1
bff:blog:{slug}:v1
bff:search:{query_hash}:v1
seo:sitemap:products:v1
seo:jsonld:product:{id}:v1
```

## 6. パフォーマンス目標

| 指標 | 目標 |
|------|------|
| TTFB (エッジヒット) | < 50ms |
| TTFB (オリジン) | < 200ms |
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| Lighthouse SEO | 100 |
| Lighthouse Performance | > 90 |
