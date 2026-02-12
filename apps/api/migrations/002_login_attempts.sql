-- ログイン試行追跡テーブル
-- アカウントロック機能のためのテーブル

CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    user_agent TEXT,

    -- インデックス用
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- メールアドレスでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);

-- 時間範囲検索用インデックス
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);

-- 複合インデックス（メール + 時間）
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempted_at DESC);

-- アカウントロック状態テーブル
CREATE TABLE IF NOT EXISTS account_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255) NOT NULL DEFAULT 'too_many_failed_attempts',
    failed_attempts INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- メールアドレスでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_account_locks_email ON account_locks(email);

-- ロック解除時間でのクリーンアップ用インデックス
CREATE INDEX IF NOT EXISTS idx_account_locks_until ON account_locks(locked_until);

-- 古いログイン試行を自動削除する関数（30日以上前）
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days';
    DELETE FROM account_locks WHERE locked_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLSポリシー（サービスロールのみアクセス可能）
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_locks ENABLE ROW LEVEL SECURITY;

-- サービスロール用ポリシー
CREATE POLICY "Service role can manage login_attempts"
    ON login_attempts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage account_locks"
    ON account_locks
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- コメント
COMMENT ON TABLE login_attempts IS 'ログイン試行履歴（セキュリティ監査用）';
COMMENT ON TABLE account_locks IS 'アカウントロック状態管理';
COMMENT ON COLUMN account_locks.locked_until IS 'ロック解除予定時刻';
COMMENT ON COLUMN account_locks.failed_attempts IS '連続失敗回数';
