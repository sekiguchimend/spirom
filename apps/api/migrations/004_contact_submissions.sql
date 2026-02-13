-- Contact Submissions Table
-- お問い合わせ情報を保存するテーブル

CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 送信者（認証ユーザー必須）
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 送信者情報
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,

    -- お問い合わせ内容
    inquiry_type VARCHAR(50) NOT NULL CHECK (inquiry_type IN ('order', 'product', 'shipping', 'return', 'other')),
    order_number VARCHAR(50),
    message TEXT NOT NULL,

    -- ステータス管理
    status VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'resolved', 'spam')),
    admin_notes TEXT,

    -- セキュリティ・監査用
    ip_address INET,
    user_agent TEXT,

    -- タイムスタンプ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON contact_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_inquiry_type ON contact_submissions(inquiry_type);

-- RLS (Row Level Security) を有効化
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- 認証ユーザーのみ自分のuser_idで挿入可能（読み取り・更新・削除は不可）
CREATE POLICY "Authenticated users can insert their own contact submissions" ON contact_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 管理者のみ全操作可能
CREATE POLICY "Admins can do everything with contact submissions" ON contact_submissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_contact_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contact_submissions_updated_at
    BEFORE UPDATE ON contact_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_submissions_updated_at();

-- コメント
COMMENT ON TABLE contact_submissions IS 'お問い合わせフォームからの送信内容を保存';
COMMENT ON COLUMN contact_submissions.inquiry_type IS 'order=注文, product=商品, shipping=配送, return=返品, other=その他';
COMMENT ON COLUMN contact_submissions.status IS 'unread=未読, read=既読, replied=返信済, resolved=解決済, spam=スパム';
COMMENT ON COLUMN contact_submissions.ip_address IS 'スパム対策・不正利用調査用';
