# 本番環境 環境変数設定

## 1. API (Fly.io)

**設定場所**: https://fly.io/apps/spirom → Secrets

```
SUPABASE_URL=https://wofkzcuijycdjwkymgtg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZmt6Y3VpanljZGp3a3ltZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODkzNDUsImV4cCI6MjA4MDU2NTM0NX0.cD73blAqo478ju7JJKUg5SH3rKXp3h6OIsiHhzQodlw
JWT_SECRET=X7kP9mN2vQ4wR8sT1uY6zB3cD5eF0gH
CORS_ORIGINS=https://spirom.vercel.app
```

---

## 2. Web (Vercel)

**設定場所**: Vercel Dashboard → Project Settings → Environment Variables

```
NEXT_PUBLIC_BFF_URL=https://spirom-bff.spirom.workers.dev
NEXT_PUBLIC_SUPABASE_URL=https://wofkzcuijycdjwkymgtg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZmt6Y3VpanljZGp3a3ltZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODkzNDUsImV4cCI6MjA4MDU2NTM0NX0.cD73blAqo478ju7JJKUg5SH3rKXp3h6OIsiHhzQodlw
NEXT_PUBLIC_SANITY_PROJECT_ID=ef16j1jl
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
NEXT_PUBLIC_SITE_URL=https://spirom.vercel.app
SANITY_WEBHOOK_SECRET=TqsUH9nLDd64bh0uiVRPjo35l1pIZBkX
```

---

## 3. BFF (Cloudflare Workers)

**設定場所**: `wrangler secret put` または Cloudflare Dashboard

### Secrets (wrangler secret put)
```
API_SECRET_KEY=<設定済み>
SANITY_TOKEN=<設定済み>
```

### 環境変数 (wrangler.toml に記載済み)
```
ENVIRONMENT=production
API_BASE_URL=https://spirom.fly.dev
SANITY_PROJECT_ID=ef16j1jl
SANITY_DATASET=production
SITE_URL=https://spirom.com
```

---

## 4. Sanity Studio

**設定場所**: sanity/studio/.env

```
SANITY_STUDIO_PROJECT_ID=ef16j1jl
SANITY_STUDIO_DATASET=production
```

---

## 本番URL一覧

| サービス | URL |
|---------|-----|
| Web (Vercel) | https://spirom.vercel.app |
| API (Fly.io) | https://spirom.fly.dev |
| BFF (Cloudflare) | https://spirom-bff.spirom.workers.dev |
| Supabase | https://wofkzcuijycdjwkymgtg.supabase.co |
| Sanity Studio | https://spirom.sanity.studio |
