-- JPYC決済対応マイグレーション
-- Polygon上のJPYCステーブルコインでの決済を可能にする

-- 1. ordersテーブルにJPYC決済用カラムを追加
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS crypto_tx_hash VARCHAR(66) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS crypto_chain_id INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS crypto_sender_address VARCHAR(42) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS crypto_confirmed_at TIMESTAMPTZ DEFAULT NULL;

-- 2. トランザクションハッシュの一意性制約（二重使用防止）
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_crypto_tx_hash
ON orders (crypto_tx_hash)
WHERE crypto_tx_hash IS NOT NULL;

-- 3. JPYC決済検証済みイベント記録テーブル（冪等性保証）
CREATE TABLE IF NOT EXISTS jpyc_payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    chain_id INTEGER NOT NULL,
    order_id UUID REFERENCES orders(id),
    sender_address VARCHAR(42) NOT NULL,
    recipient_address VARCHAR(42) NOT NULL,
    amount_wei VARCHAR(78) NOT NULL,
    amount_jpyc BIGINT NOT NULL,
    block_number BIGINT NOT NULL,
    block_hash VARCHAR(66) NOT NULL,
    confirmations INTEGER NOT NULL DEFAULT 0,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. tx_hashでの高速検索用インデックス
CREATE INDEX IF NOT EXISTS idx_jpyc_payment_events_tx_hash
ON jpyc_payment_events (tx_hash);

-- 5. 未処理トランザクション検索用インデックス
CREATE INDEX IF NOT EXISTS idx_jpyc_payment_events_order_id
ON jpyc_payment_events (order_id)
WHERE order_id IS NOT NULL;

-- 6. RLSポリシー（jpyc_payment_eventsはサービスロールのみ）
ALTER TABLE jpyc_payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage jpyc_payment_events"
ON jpyc_payment_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 7. JPYC決済イベント記録RPC（冪等性保証）
CREATE OR REPLACE FUNCTION record_jpyc_payment_event(
    p_tx_hash VARCHAR(66),
    p_chain_id INTEGER,
    p_sender_address VARCHAR(42),
    p_recipient_address VARCHAR(42),
    p_amount_wei VARCHAR(78),
    p_amount_jpyc BIGINT,
    p_block_number BIGINT,
    p_block_hash VARCHAR(66),
    p_confirmations INTEGER
) RETURNS TABLE(
    event_id UUID,
    is_new BOOLEAN
) AS $$
DECLARE
    v_event_id UUID;
    v_is_new BOOLEAN := FALSE;
BEGIN
    -- 既存イベントを確認
    SELECT id INTO v_event_id
    FROM jpyc_payment_events
    WHERE tx_hash = p_tx_hash;

    IF v_event_id IS NULL THEN
        -- 新規イベント作成
        INSERT INTO jpyc_payment_events (
            tx_hash, chain_id, sender_address, recipient_address,
            amount_wei, amount_jpyc, block_number, block_hash, confirmations
        ) VALUES (
            p_tx_hash, p_chain_id, p_sender_address, p_recipient_address,
            p_amount_wei, p_amount_jpyc, p_block_number, p_block_hash, p_confirmations
        ) RETURNING id INTO v_event_id;
        v_is_new := TRUE;
    ELSE
        -- 既存イベントのconfirmations更新
        UPDATE jpyc_payment_events
        SET confirmations = p_confirmations
        WHERE id = v_event_id AND confirmations < p_confirmations;
    END IF;

    RETURN QUERY SELECT v_event_id, v_is_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. コメント追加
COMMENT ON COLUMN orders.crypto_tx_hash IS 'ブロックチェーン上のトランザクションハッシュ（0x含む66文字）';
COMMENT ON COLUMN orders.crypto_chain_id IS 'チェーンID（137=Polygon mainnet）';
COMMENT ON COLUMN orders.crypto_sender_address IS '送金元ウォレットアドレス（0x含む42文字）';
COMMENT ON COLUMN orders.crypto_confirmed_at IS 'トランザクション確認完了日時';
COMMENT ON TABLE jpyc_payment_events IS 'JPYC決済のブロックチェーン検証記録（冪等性・監査用）';
