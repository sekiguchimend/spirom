-- ============================================
-- Tシャツのサイズ寸法・素材情報の追加
-- Supabaseダッシュボードで実行してください
-- ============================================

-- ========== product_variantsテーブルに寸法カラムを追加 ==========

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS body_length INT;     -- 身丈 (cm)
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS body_width INT;      -- 身幅 (cm)
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS shoulder_width INT;  -- 肩幅 (cm)
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS sleeve_length INT;   -- 袖丈 (cm)

-- ========== productsテーブルに素材情報カラムを追加 ==========

ALTER TABLE products ADD COLUMN IF NOT EXISTS material TEXT;        -- 素材情報
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_detail TEXT; -- 素材詳細

-- ========== Tシャツ商品を特定してサイズバリエーションを追加 ==========
-- 注意: product_idは実際の商品IDに置き換えてください

-- まず、既存のTシャツ商品のサイズバリエーションを確認・更新するための関数
CREATE OR REPLACE FUNCTION add_tshirt_variants(p_product_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 既存のバリアントを削除（クリーンアップ）
    DELETE FROM product_variants WHERE product_id = p_product_id;

    -- サイズバリエーションを追加
    INSERT INTO product_variants (product_id, size, stock, sort_order, body_length, body_width, shoulder_width, sleeve_length, is_active)
    VALUES
        (p_product_id, 'S',    50, 0, 66, 49, 44, 19, true),
        (p_product_id, 'M',    50, 1, 70, 52, 47, 20, true),
        (p_product_id, 'L',    50, 2, 74, 55, 50, 22, true),
        (p_product_id, 'XL',   50, 3, 78, 58, 53, 24, true),
        (p_product_id, 'XXL',  50, 4, 82, 61, 56, 26, true),
        (p_product_id, 'XXXL', 50, 5, 84, 64, 59, 26, true);
END;
$$ LANGUAGE plpgsql;

-- ========== 素材情報を更新する関数 ==========
CREATE OR REPLACE FUNCTION set_tshirt_material(p_product_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE products
    SET
        material = '綿100％',
        material_detail = '※杢グレー：綿80％、ポリエステル20％
※アッシュ：綿95％、ポリエステル5％
※ホワイトのみ綿糸縫製
190g/㎡（5.6oz）17/-天竺
Printstar ヘビーウェイトTシャツ'
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- ========== 使用方法 ==========
-- 1. まず商品IDを確認:
--    SELECT id, name, slug FROM products WHERE name LIKE '%Tシャツ%';
--
-- 2. サイズバリエーションを追加:
--    SELECT add_tshirt_variants('商品ID');
--
-- 3. 素材情報を追加:
--    SELECT set_tshirt_material('商品ID');
--
-- 例:
-- SELECT add_tshirt_variants('12345678-1234-1234-1234-123456789abc');
-- SELECT set_tshirt_material('12345678-1234-1234-1234-123456789abc');
