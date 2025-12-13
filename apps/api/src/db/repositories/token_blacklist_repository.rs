use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::db::AuthenticatedClient;
use crate::error::Result;

pub struct TokenBlacklistRepository {
    client: AuthenticatedClient,
}

impl TokenBlacklistRepository {
    pub fn new(client: AuthenticatedClient) -> Self {
        Self { client }
    }

    /// トークンをブラックリストに追加
    pub async fn add(&self, jti: &str, user_id: uuid::Uuid, expires_at: DateTime<Utc>) -> Result<()> {
        let input = BlacklistInput {
            jti: jti.to_string(),
            user_id,
            expires_at,
            created_at: Utc::now(),
        };

        let _: BlacklistRow = self.client.insert("token_blacklist", &input).await?;
        Ok(())
    }

    /// トークンがブラックリストに存在するか確認
    pub async fn is_blacklisted(&self, jti: &str) -> Result<bool> {
        let query = format!("jti=eq.{}", urlencoding::encode(jti));
        let result: Option<BlacklistRow> = self.client.select_single("token_blacklist", &query).await?;
        Ok(result.is_some())
    }

    /// 期限切れのブラックリストエントリを削除（クリーンアップ用）
    pub async fn cleanup_expired(&self) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        let query = format!("expires_at=lt.{}", urlencoding::encode(&now));
        self.client.delete("token_blacklist", &query).await?;
        Ok(())
    }

    /// ユーザーの全トークンをブラックリストに追加（パスワード変更時等）
    pub async fn blacklist_all_user_tokens(&self, user_id: uuid::Uuid, expires_at: DateTime<Utc>) -> Result<()> {
        // 特殊なJTIを使って全トークン無効化をマーク
        let input = BlacklistInput {
            jti: format!("all_tokens_{}", user_id),
            user_id,
            expires_at,
            created_at: Utc::now(),
        };

        let _: BlacklistRow = self.client.insert("token_blacklist", &input).await?;
        Ok(())
    }

    /// ユーザーの全トークンがブラックリストされているか確認
    pub async fn is_user_blacklisted(&self, user_id: uuid::Uuid) -> Result<bool> {
        let jti = format!("all_tokens_{}", user_id);
        let now = Utc::now().to_rfc3339();
        let query = format!(
            "jti=eq.{}&expires_at=gt.{}",
            urlencoding::encode(&jti),
            urlencoding::encode(&now)
        );
        let result: Option<BlacklistRow> = self.client.select_single("token_blacklist", &query).await?;
        Ok(result.is_some())
    }
}

#[derive(Debug, Serialize)]
struct BlacklistInput {
    jti: String,
    user_id: uuid::Uuid,
    expires_at: DateTime<Utc>,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct BlacklistRow {
    #[allow(dead_code)]
    jti: String,
    #[allow(dead_code)]
    user_id: uuid::Uuid,
    #[allow(dead_code)]
    expires_at: DateTime<Utc>,
    #[allow(dead_code)]
    created_at: DateTime<Utc>,
}
