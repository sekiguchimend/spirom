use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use super::{UserPublic, UserRole};

/// ユーザー登録リクエスト
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

/// ログインリクエスト
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

/// JWTクレーム
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,        // ユーザーID
    pub email: String,
    pub role: UserRole,
    pub exp: i64,         // 有効期限
    pub iat: i64,         // 発行時刻
    pub jti: String,      // トークンID
}

impl Claims {
    pub fn new(user_id: Uuid, email: String, role: UserRole, expires_in: i64) -> Self {
        let now = chrono::Utc::now().timestamp();
        Self {
            sub: user_id,
            email,
            role,
            exp: now + expires_in,
            iat: now,
            jti: Uuid::new_v4().to_string(),
        }
    }
}

/// 認証済みユーザー情報（リクエストエクステンション用）
#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub id: Uuid,
    pub email: String,
    pub role: UserRole,
}

impl From<Claims> for AuthenticatedUser {
    fn from(claims: Claims) -> Self {
        Self {
            id: claims.sub,
            email: claims.email,
            role: claims.role,
        }
    }
}
