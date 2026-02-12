use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::AuthenticatedClient;
use crate::error::Result;

/// ログイン試行追跡 + アカウントロック管理
pub struct LoginAttemptsRepository {
    client: AuthenticatedClient,
}

/// アカウントロックの設定
const MAX_FAILED_ATTEMPTS: i32 = 10; // 最大失敗回数
const LOCKOUT_DURATION_MINUTES: i64 = 30; // ロック時間（分）
const ATTEMPT_WINDOW_MINUTES: i64 = 15; // 失敗カウント対象時間（分）

impl LoginAttemptsRepository {
    pub fn new(client: AuthenticatedClient) -> Self {
        Self { client }
    }

    /// ログイン試行を記録
    pub async fn record_attempt(
        &self,
        email: &str,
        ip_address: &str,
        success: bool,
        user_agent: Option<&str>,
    ) -> Result<()> {
        let input = LoginAttemptInput {
            id: Uuid::new_v4(),
            email: email.to_string(),
            ip_address: ip_address.to_string(),
            attempted_at: Utc::now(),
            success,
            user_agent: user_agent.map(|s| s.to_string()),
            created_at: Utc::now(),
        };

        let _: LoginAttemptRow = self.client.insert("login_attempts", &input).await?;
        Ok(())
    }

    /// 指定時間内の失敗試行回数を取得
    pub async fn get_failed_attempts_count(&self, email: &str) -> Result<i32> {
        let window_start = (Utc::now() - Duration::minutes(ATTEMPT_WINDOW_MINUTES)).to_rfc3339();
        let query = format!(
            "email=eq.{}&success=eq.false&attempted_at=gte.{}&select=id",
            urlencoding::encode(email),
            urlencoding::encode(&window_start)
        );

        // カウントを取得
        let result: Vec<CountRow> = self.client.select("login_attempts", &query).await?;
        Ok(result.len() as i32)
    }

    /// アカウントがロックされているか確認
    pub async fn is_account_locked(&self, email: &str) -> Result<Option<AccountLock>> {
        let now = Utc::now().to_rfc3339();
        let query = format!(
            "email=eq.{}&locked_until=gt.{}",
            urlencoding::encode(email),
            urlencoding::encode(&now)
        );

        let result: Option<AccountLockRow> = self.client.select_single("account_locks", &query).await?;
        Ok(result.map(|r| AccountLock {
            email: r.email,
            locked_at: r.locked_at,
            locked_until: r.locked_until,
            failed_attempts: r.failed_attempts,
        }))
    }

    /// アカウントをロック
    pub async fn lock_account(&self, email: &str, failed_attempts: i32) -> Result<AccountLock> {
        let now = Utc::now();
        let locked_until = now + Duration::minutes(LOCKOUT_DURATION_MINUTES);

        // 既存のロックを削除してから新規作成
        let delete_query = format!("email=eq.{}", urlencoding::encode(email));
        let _ = self.client.delete("account_locks", &delete_query).await;

        let input = AccountLockInput {
            id: Uuid::new_v4(),
            email: email.to_string(),
            locked_at: now,
            locked_until,
            reason: "too_many_failed_attempts".to_string(),
            failed_attempts,
            created_at: now,
            updated_at: now,
        };

        let row: AccountLockRow = self.client.insert("account_locks", &input).await?;

        Ok(AccountLock {
            email: row.email,
            locked_at: row.locked_at,
            locked_until: row.locked_until,
            failed_attempts: row.failed_attempts,
        })
    }

    /// アカウントロックを解除
    pub async fn unlock_account(&self, email: &str) -> Result<()> {
        let query = format!("email=eq.{}", urlencoding::encode(email));
        self.client.delete("account_locks", &query).await?;
        Ok(())
    }

    /// ログイン失敗を処理（カウント更新 + 必要に応じてロック）
    pub async fn handle_failed_login(
        &self,
        email: &str,
        ip_address: &str,
        user_agent: Option<&str>,
    ) -> Result<LoginAttemptResult> {
        // 試行を記録
        self.record_attempt(email, ip_address, false, user_agent).await?;

        // 失敗回数を取得
        let failed_count = self.get_failed_attempts_count(email).await?;

        // 最大失敗回数を超えたらロック
        if failed_count >= MAX_FAILED_ATTEMPTS {
            let lock = self.lock_account(email, failed_count).await?;
            return Ok(LoginAttemptResult::Locked {
                until: lock.locked_until,
                attempts: failed_count,
            });
        }

        Ok(LoginAttemptResult::Failed {
            attempts: failed_count,
            max_attempts: MAX_FAILED_ATTEMPTS,
        })
    }

    /// ログイン成功を処理（ロック解除 + 記録）
    pub async fn handle_successful_login(
        &self,
        email: &str,
        ip_address: &str,
        user_agent: Option<&str>,
    ) -> Result<()> {
        // 成功を記録
        self.record_attempt(email, ip_address, true, user_agent).await?;

        // ロックがあれば解除
        self.unlock_account(email).await?;

        Ok(())
    }

    /// 古い試行履歴をクリーンアップ
    pub async fn cleanup_old_attempts(&self) -> Result<()> {
        let cutoff = (Utc::now() - Duration::days(30)).to_rfc3339();
        let query = format!("attempted_at=lt.{}", urlencoding::encode(&cutoff));
        self.client.delete("login_attempts", &query).await?;

        // 期限切れのロックも削除
        let now = Utc::now().to_rfc3339();
        let lock_query = format!("locked_until=lt.{}", urlencoding::encode(&now));
        self.client.delete("account_locks", &lock_query).await?;

        Ok(())
    }
}

/// ログイン試行の結果
#[derive(Debug)]
pub enum LoginAttemptResult {
    /// ログイン失敗（ロックなし）
    Failed {
        attempts: i32,
        max_attempts: i32,
    },
    /// アカウントがロックされた
    Locked {
        until: DateTime<Utc>,
        attempts: i32,
    },
}

/// アカウントロック情報
#[derive(Debug)]
pub struct AccountLock {
    pub email: String,
    pub locked_at: DateTime<Utc>,
    pub locked_until: DateTime<Utc>,
    pub failed_attempts: i32,
}

// 内部構造体
#[derive(Debug, Serialize)]
struct LoginAttemptInput {
    id: Uuid,
    email: String,
    ip_address: String,
    attempted_at: DateTime<Utc>,
    success: bool,
    user_agent: Option<String>,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct LoginAttemptRow {
    #[allow(dead_code)]
    id: Uuid,
    #[allow(dead_code)]
    email: String,
    #[allow(dead_code)]
    ip_address: String,
    #[allow(dead_code)]
    attempted_at: DateTime<Utc>,
    #[allow(dead_code)]
    success: bool,
    #[allow(dead_code)]
    user_agent: Option<String>,
    #[allow(dead_code)]
    created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct CountRow {
    #[allow(dead_code)]
    id: Uuid,
}

#[derive(Debug, Serialize)]
struct AccountLockInput {
    id: Uuid,
    email: String,
    locked_at: DateTime<Utc>,
    locked_until: DateTime<Utc>,
    reason: String,
    failed_attempts: i32,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct AccountLockRow {
    #[allow(dead_code)]
    id: Uuid,
    email: String,
    locked_at: DateTime<Utc>,
    locked_until: DateTime<Utc>,
    #[allow(dead_code)]
    reason: String,
    failed_attempts: i32,
    #[allow(dead_code)]
    created_at: DateTime<Utc>,
    #[allow(dead_code)]
    updated_at: DateTime<Utc>,
}
