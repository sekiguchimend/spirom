# 在庫確保RPC（reserve_stock_bulk / release_stock_bulk）のセットアップ

注文作成では、同時購入でも在庫がマイナスにならないように **Postgres のRPC関数**を使って在庫を原子的に確保します。

エラー例:

- `PGRST202 ... Could not find the function public.reserve_stock_bulk(p_items) in the schema cache`

## 手順（Supabase ダッシュボード）

1. Supabase Dashboard → **SQL Editor** を開く
2. `apps/api/src/db/schema.rs` の中から以下の2つの関数定義を貼り付けて実行
   - `CREATE OR REPLACE FUNCTION reserve_stock_bulk(p_items JSONB) ...`
   - `CREATE OR REPLACE FUNCTION release_stock_bulk(p_items JSONB) ...`

※ 実行後、PostgREST の schema cache が反映されるまで少し時間がかかる場合があります（数十秒程度）。

## 期待する権限

`schema.rs` の定義どおり:

- `SECURITY DEFINER`
- `GRANT EXECUTE ... TO service_role`

これにより API 側（service_role key 使用時）がRPCを実行できます。


