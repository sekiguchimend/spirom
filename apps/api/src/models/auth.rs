use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use super::{UserPublic, UserRole};

/// ユーザー登録リクエスト（レガシー、Supabase Auth移行後は不使用）
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, max = 100))]
    pub password: String,
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    #[validate(length(max = 20))]
    pub phone: Option<String>,
}

/// ログインリクエスト（レガシー、Supabase Auth移行後は不使用）
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 1))]
    pub password: String,
}

/// トークンレスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

impl TokenResponse {
    pub fn new(access_token: String, refresh_token: String, expires_in: i64) -> Self {
        Self {
            access_token,
            refresh_token,
            token_type: "Bearer".to_string(),
            expires_in,
        }
    }
}

/// 認証レスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResponse {
    pub user: UserPublic,
    pub tokens: TokenResponse,
}

/// トークン更新リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct RefreshTokenRequest {
    #[validate(length(min = 1))]
    pub refresh_token: String,
}

/// パスワードリセット要求
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct ForgotPasswordRequest {
    #[validate(email)]
    pub email: String,
}

/// パスワードリセット実行
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct ResetPasswordRequest {
    #[validate(length(min = 1))]
    pub token: String,
    #[validate(length(min = 8, max = 100))]
    pub new_password: String,
}

/// Supabase Auth JWTクレーム
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,      // ユーザーID (UUID as string)
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub role: Option<String>,  // "authenticated" | "anon"
    #[serde(default)]
    pub aud: Option<String>,   // "authenticated"
    pub exp: i64,         // 有効期限
    pub iat: i64,         // 発行時刻
    #[serde(default)]
    pub iss: Option<String>,   // issuer
    #[serde(default)]
    pub app_metadata: Option<serde_json::Value>,
    #[serde(default)]
    pub user_metadata: Option<serde_json::Value>,
}

impl Claims {
    /// ユーザーIDをUuidとして取得
    pub fn user_id(&self) -> Option<Uuid> {
        Uuid::parse_str(&self.sub).ok()
    }

    /// メールアドレスを取得
    pub fn email(&self) -> String {
        self.email.clone().unwrap_or_default()
    }

    /// ロールをUserRoleに変換
    pub fn user_role(&self) -> UserRole {
        // user_metadataからroleを取得（カスタムクレーム）
        if let Some(metadata) = &self.user_metadata {
            if let Some(role) = metadata.get("role").and_then(|r| r.as_str()) {
                if role == "admin" {
                    return UserRole::Admin;
                }
            }
        }
        // app_metadataからroleを取得
        if let Some(metadata) = &self.app_metadata {
            if let Some(role) = metadata.get("role").and_then(|r| r.as_str()) {
                if role == "admin" {
                    return UserRole::Admin;
                }
            }
        }
        UserRole::User
    }
}

/// 認証済みユーザー情報（リクエストエクステンション用）
#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub id: Uuid,
    pub email: String,
    pub role: UserRole,
}

impl TryFrom<Claims> for AuthenticatedUser {
    type Error = &'static str;

    fn try_from(claims: Claims) -> Result<Self, Self::Error> {
        let id = claims.user_id().ok_or("Invalid user ID in token")?;
        Ok(Self {
            id,
            email: claims.email(),
            role: claims.user_role(),
        })
    }
}

/// プロファイル作成リクエスト（Supabase Auth登録後にusersテーブルに追加）
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateProfileRequest {
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    #[validate(length(max = 20))]
    pub phone: Option<String>,
}
