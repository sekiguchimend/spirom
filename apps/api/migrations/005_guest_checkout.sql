-- ゲストチェックアウト用のテーブル変更
-- user_idをNULL許可に変更し、ゲスト注文用フィールドを追加

-- user_idをNULL許可に変更
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- ゲスト用フィールド追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_access_token_hash TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_token_expires_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_guest_order BOOLEAN DEFAULT FALSE;

-- ゲストトークンのインデックス（NULLでないものだけ）
CREATE INDEX IF NOT EXISTS idx_orders_guest_token
  ON orders(guest_access_token_hash)
  WHERE guest_access_token_hash IS NOT NULL;

-- ゲスト注文のインデックス
CREATE INDEX IF NOT EXISTS idx_orders_is_guest
  ON orders(is_guest_order)
  WHERE is_guest_order = TRUE;

-- RLSポリシー更新：ゲスト注文はservice_roleで挿入可能
-- 既存のINSERTポリシーがある場合は変更が必要
-- ゲスト注文（user_id IS NULL）はservice_roleのみが操作可能

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS orders_insert_policy ON orders;
DROP POLICY IF EXISTS orders_select_policy ON orders;
DROP POLICY IF EXISTS orders_update_policy ON orders;

-- 新しいポリシー：ユーザーは自分の注文のみ閲覧可能、ゲスト注文はservice_roleのみ
CREATE POLICY orders_select_policy ON orders
  FOR SELECT
  USING (
    -- 認証済みユーザーの場合：自分の注文のみ
    (auth.uid() = user_id)
    -- 管理者の場合：全ての注文
    OR (auth.jwt() ->> 'role' = 'admin')
    -- service_roleの場合：全ての注文（Webhook等）
    OR (auth.role() = 'service_role')
  );

-- INSERTポリシー：認証済みユーザーは自分の注文のみ、service_roleは全て
CREATE POLICY orders_insert_policy ON orders
  FOR INSERT
  WITH CHECK (
    -- 認証済みユーザー：user_idが自分のID
    (auth.uid() = user_id AND user_id IS NOT NULL)
    -- service_role：ゲスト注文含め全て挿入可能
    OR (auth.role() = 'service_role')
  );

-- UPDATEポリシー：認証済みユーザーは自分の注文のみ、service_roleは全て
CREATE POLICY orders_update_policy ON orders
  FOR UPDATE
  USING (
    (auth.uid() = user_id)
    OR (auth.jwt() ->> 'role' = 'admin')
    OR (auth.role() = 'service_role')
  );

-- order_itemsのRLSも更新（ゲスト注文に対応）
DROP POLICY IF EXISTS order_items_select_policy ON order_items;
DROP POLICY IF EXISTS order_items_insert_policy ON order_items;

CREATE POLICY order_items_select_policy ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.user_id = auth.uid()
        OR auth.jwt() ->> 'role' = 'admin'
        OR auth.role() = 'service_role'
      )
    )
  );

CREATE POLICY order_items_insert_policy ON order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        (orders.user_id = auth.uid() AND orders.user_id IS NOT NULL)
        OR auth.role() = 'service_role'
      )
    )
  );
