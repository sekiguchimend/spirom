/// Supabase用スキーマ定義（SQLマイグレーション）
///
/// このファイルはSupabaseダッシュボードまたはマイグレーションで実行するSQLを定義します。
/// RLS（Row Level Security）を有効にし、anon keyでのアクセスを制御します。

/// テーブル作成SQL
pub const CREATE_TABLES_SQL: &str = r#"
-- ========== ユーザー関連 ==========

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    role TEXT DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- auth.usersと連携（Supabase Auth使用時）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみ参照・更新可能
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text OR role = 'admin');

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- 住所テーブル
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT,
    postal_code TEXT NOT NULL,
    prefecture TEXT NOT NULL,
    city TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    phone TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own addresses" ON addresses
    FOR ALL USING (auth.uid()::text = user_id::text);

-- ========== カテゴリ関連 ==========

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    product_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- カテゴリは誰でも参照可能（公開データ）
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

-- 管理者のみ作成・更新・削除可能
CREATE POLICY "Only admins can modify categories" ON categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

-- ========== 商品関連 ==========

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price BIGINT NOT NULL,
    compare_at_price BIGINT,
    currency TEXT DEFAULT 'JPY',
    category_id UUID REFERENCES categories(id),
    images TEXT[] DEFAULT '{}',
    stock INT DEFAULT 0,
    sku TEXT,
    weight INT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 商品は誰でも参照可能（公開データ）
CREATE POLICY "Products are viewable by everyone" ON products
    FOR SELECT USING (is_active = true);

-- 管理者は全商品参照可能
CREATE POLICY "Admins can view all products" ON products
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

-- 管理者のみ作成・更新・削除可能
CREATE POLICY "Only admins can modify products" ON products
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

CREATE POLICY "Only admins can update products" ON products
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

CREATE POLICY "Only admins can delete products" ON products
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

-- ========== カート関連 ==========

CREATE TABLE IF NOT EXISTS cart_metadata (
    session_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cart_metadata ENABLE ROW LEVEL SECURITY;

-- カートは所有者のみアクセス可能（session_idまたはuser_id）
CREATE POLICY "Users can access own cart" ON cart_metadata
    FOR ALL USING (
        user_id IS NULL OR auth.uid()::text = user_id::text
    );

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES cart_metadata(session_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name TEXT,
    product_slug TEXT,
    price BIGINT,
    quantity INT DEFAULT 1,
    image_url TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, product_id)
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- カートアイテムはカートメタデータ経由でアクセス制御
CREATE POLICY "Users can access own cart items" ON cart_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cart_metadata
            WHERE session_id = cart_items.session_id
            AND (user_id IS NULL OR auth.uid()::text = user_id::text)
        )
    );

-- ========== 注文関連 ==========

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    order_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    subtotal BIGINT NOT NULL,
    shipping_fee BIGINT DEFAULT 0,
    tax BIGINT DEFAULT 0,
    total BIGINT NOT NULL,
    currency TEXT DEFAULT 'JPY',
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    payment_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の注文のみ参照可能
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- ユーザーは注文を作成可能
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 管理者は全注文参照・更新可能
CREATE POLICY "Admins can manage all orders" ON orders
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    product_sku TEXT,
    price BIGINT NOT NULL,
    quantity INT NOT NULL,
    subtotal BIGINT NOT NULL,
    image_url TEXT
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 注文アイテムは注文経由でアクセス制御
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = order_items.order_id
            AND (auth.uid()::text = user_id::text OR
                 EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'))
        )
    );

CREATE POLICY "Users can create order items" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = order_items.order_id
            AND auth.uid()::text = user_id::text
        )
    );

-- ========== Stripe Webhook（冪等性） ==========

CREATE TABLE IF NOT EXISTS stripe_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    payment_intent_id TEXT,
    order_id UUID REFERENCES orders(id),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- 原則: 通常ユーザーは参照不可（機微情報/不正利用防止）
-- 管理者のみ参照可能（運用トラブルシュート用）
CREATE POLICY "Admins can view stripe events" ON stripe_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

-- ========== レビュー関連 ==========

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    user_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 承認済みレビューは誰でも参照可能
CREATE POLICY "Approved reviews are viewable by everyone" ON reviews
    FOR SELECT USING (is_approved = true);

-- ユーザーは自分のレビューを参照可能
CREATE POLICY "Users can view own reviews" ON reviews
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- ユーザーはレビューを作成可能
CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- ユーザーは自分のレビューを更新可能
CREATE POLICY "Users can update own reviews" ON reviews
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 管理者は全レビュー管理可能
CREATE POLICY "Admins can manage all reviews" ON reviews
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    );

-- ========== リフレッシュトークン ==========

CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tokens" ON refresh_tokens
    FOR ALL USING (auth.uid()::text = user_id::text);

-- ========== トークンブラックリスト（セキュリティ） ==========

CREATE TABLE IF NOT EXISTS token_blacklist (
    jti TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE token_blacklist ENABLE ROW LEVEL SECURITY;

-- service_roleのみアクセス可能（通常ユーザーは参照不可）
CREATE POLICY "Service role only for token blacklist" ON token_blacklist
    FOR ALL USING (false);

-- 期限切れエントリを自動削除するためのインデックス
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- ========== RPC: Stripe Event 記録（冪等性） ==========
CREATE OR REPLACE FUNCTION record_stripe_event(
    p_event_id TEXT,
    p_event_type TEXT,
    p_payment_intent_id TEXT,
    p_order_id UUID,
    p_payload JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO stripe_events(event_id, event_type, payment_intent_id, order_id, payload, created_at)
    VALUES (p_event_id, p_event_type, p_payment_intent_id, p_order_id, p_payload, NOW())
    ON CONFLICT (event_id) DO NOTHING;

    -- FOUND は直近SQLで行が挿入されたかどうかを表す
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION record_stripe_event(TEXT, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_stripe_event(TEXT, TEXT, TEXT, UUID, JSONB) TO service_role;

-- ========== RPC: 在庫の原子ロック/解放 ==========
CREATE OR REPLACE FUNCTION reserve_stock_bulk(p_items JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    item JSONB;
    pid UUID;
    qty INT;
    current_stock INT;
BEGIN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RETURN FALSE;
    END IF;

    -- 先に対象行をロックして在庫確認（同時購入の競合対策）
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        pid := (item->>'product_id')::uuid;
        qty := (item->>'quantity')::int;
        IF qty IS NULL OR qty <= 0 THEN
            RETURN FALSE;
        END IF;

        SELECT stock INTO current_stock FROM products WHERE id = pid FOR UPDATE;
        IF current_stock IS NULL OR current_stock < qty THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    -- 在庫確保（減算）
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        pid := (item->>'product_id')::uuid;
        qty := (item->>'quantity')::int;
        UPDATE products
        SET stock = stock - qty, updated_at = NOW()
        WHERE id = pid;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION reserve_stock_bulk(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_stock_bulk(JSONB) TO service_role;

CREATE OR REPLACE FUNCTION release_stock_bulk(p_items JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    item JSONB;
    pid UUID;
    qty INT;
BEGIN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RETURN FALSE;
    END IF;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        pid := (item->>'product_id')::uuid;
        qty := (item->>'quantity')::int;
        IF qty IS NULL OR qty <= 0 THEN
            RETURN FALSE;
        END IF;

        UPDATE products
        SET stock = stock + qty, updated_at = NOW()
        WHERE id = pid;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION release_stock_bulk(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION release_stock_bulk(JSONB) TO service_role;
"#;

/// インデックス作成SQL
pub const CREATE_INDEXES_SQL: &str = r#"
-- ユーザー関連
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- 商品関連
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;

-- カテゴリ関連
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- 注文関連
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- レビュー関連
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved) WHERE is_approved = true;

-- カート関連
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items(session_id);
"#;

/// レビュー統計用RPC関数
pub const CREATE_REVIEW_STATS_FUNCTION: &str = r#"
CREATE OR REPLACE FUNCTION get_review_stats(p_product_id UUID)
RETURNS TABLE (
    average_rating NUMERIC,
    total_reviews BIGINT,
    one_star BIGINT,
    two_star BIGINT,
    three_star BIGINT,
    four_star BIGINT,
    five_star BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(AVG(rating::numeric), 0) as average_rating,
        COUNT(*) as total_reviews,
        COUNT(*) FILTER (WHERE rating = 1) as one_star,
        COUNT(*) FILTER (WHERE rating = 2) as two_star,
        COUNT(*) FILTER (WHERE rating = 3) as three_star,
        COUNT(*) FILTER (WHERE rating = 4) as four_star,
        COUNT(*) FILTER (WHERE rating = 5) as five_star
    FROM reviews
    WHERE product_id = p_product_id AND is_approved = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"#;
