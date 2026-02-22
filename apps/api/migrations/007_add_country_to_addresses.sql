-- 住所テーブルに国コードカラムを追加
-- ISO 3166-1 alpha-2 形式（JP, US, CN など）

-- countryカラムを追加（デフォルトはJP）
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'JP';

-- 既存データは全てJPに設定済み（デフォルト値により）

-- countryカラムにインデックスを追加（国別での検索を高速化）
CREATE INDEX IF NOT EXISTS idx_addresses_country ON addresses(country);

-- コメント追加
COMMENT ON COLUMN addresses.country IS 'ISO 3166-1 alpha-2 国コード (例: JP, US, CN)';
