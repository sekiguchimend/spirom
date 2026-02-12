-- ============================================
-- サイズバリエーション機能の追加
-- Supabaseダッシュボードで実行してください
-- ============================================

-- ========== 商品バリアント（サイズ）テーブル ==========

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,                    -- S, M, L, XL, XXL, FREE など
    sku TEXT,                              -- バリアント固有のSKU（オプション）
    stock INT DEFAULT 0,                   -- サイズ別在庫
    price_adjustment BIGINT DEFAULT 0,     -- サイズによる価格調整（+500円など）
    sort_order INT DEFAULT 0,              -- 表示順
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, size)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active) WHERE is_active = true;

-- RLS有効化
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- 誰でも参照可能（公開データ）
CREATE POLICY "Product variants are viewable by everyone" ON product_variants
    FOR SELECT USING (is_active = true);

-- 管理者のみ作成・更新・削除可能
CREATE POLICY "Only admins can insert variants" ON product_variants
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

CREATE POLICY "Only admins can update variants" ON product_variants
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

CREATE POLICY "Only admins can delete variants" ON product_variants
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

-- ========== カートアイテムにバリアント追加 ==========

-- variant_idカラムを追加
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS size TEXT;

-- ユニーク制約を更新（session_id + product_id + variant_id）
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_session_id_product_id_key;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_session_product_variant_unique
    UNIQUE(session_id, product_id, variant_id);

-- ========== 注文アイテムにサイズ追加 ==========

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size TEXT;

-- ========== サイズ別在庫確保RPC ==========

CREATE OR REPLACE FUNCTION reserve_stock_with_variants(p_items JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    item JSONB;
    vid UUID;
    qty INT;
    current_stock INT;
BEGIN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RETURN FALSE;
    END IF;

    -- 先に対象行をロックして在庫確認
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        vid := (item->>'variant_id')::uuid;
        qty := (item->>'quantity')::int;

        IF vid IS NULL OR qty IS NULL OR qty <= 0 THEN
            RETURN FALSE;
        END IF;

        SELECT stock INTO current_stock FROM product_variants WHERE id = vid FOR UPDATE;
        IF current_stock IS NULL OR current_stock < qty THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    -- 在庫確保（減算）
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        vid := (item->>'variant_id')::uuid;
        qty := (item->>'quantity')::int;
        UPDATE product_variants
        SET stock = stock - qty, updated_at = NOW()
        WHERE id = vid;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION reserve_stock_with_variants(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_stock_with_variants(JSONB) TO service_role;

-- ========== サイズ別在庫解放RPC ==========

CREATE OR REPLACE FUNCTION release_stock_with_variants(p_items JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    item JSONB;
    vid UUID;
    qty INT;
BEGIN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RETURN FALSE;
    END IF;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        vid := (item->>'variant_id')::uuid;
        qty := (item->>'quantity')::int;

        IF vid IS NULL OR qty IS NULL OR qty <= 0 THEN
            RETURN FALSE;
        END IF;

        UPDATE product_variants
        SET stock = stock + qty, updated_at = NOW()
        WHERE id = vid;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION release_stock_with_variants(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION release_stock_with_variants(JSONB) TO service_role;

-- ========== 商品の合計在庫を取得するビュー ==========

CREATE OR REPLACE VIEW product_stock_summary AS
SELECT
    p.id as product_id,
    p.slug,
    p.name,
    COALESCE(SUM(pv.stock), 0) as total_stock,
    COUNT(pv.id) as variant_count,
    ARRAY_AGG(
        jsonb_build_object(
            'id', pv.id,
            'size', pv.size,
            'stock', pv.stock,
            'price_adjustment', pv.price_adjustment
        ) ORDER BY pv.sort_order
    ) FILTER (WHERE pv.id IS NOT NULL) as variants
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = true
GROUP BY p.id, p.slug, p.name;

-- ========== サンプルデータ挿入用のヘルパー関数 ==========
-- 既存商品にサイズバリエーションを追加する

CREATE OR REPLACE FUNCTION add_size_variants_to_product(
    p_product_id UUID,
    p_sizes TEXT[] DEFAULT ARRAY['S', 'M', 'L', 'XL'],
    p_default_stock INT DEFAULT 10
)
RETURNS VOID AS $$
DECLARE
    s TEXT;
    i INT := 0;
BEGIN
    FOREACH s IN ARRAY p_sizes
    LOOP
        INSERT INTO product_variants (product_id, size, stock, sort_order)
        VALUES (p_product_id, s, p_default_stock, i)
        ON CONFLICT (product_id, size) DO UPDATE SET stock = p_default_stock;
        i := i + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========== 既存商品に一括でサイズを追加 ==========
-- 実行例: SELECT add_sizes_to_all_products();

CREATE OR REPLACE FUNCTION add_sizes_to_all_products()
RETURNS VOID AS $$
DECLARE
    prod RECORD;
BEGIN
    FOR prod IN SELECT id FROM products WHERE is_active = true
    LOOP
        PERFORM add_size_variants_to_product(prod.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
