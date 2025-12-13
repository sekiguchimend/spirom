use chrono::Utc;
use jsonwebtoken::{encode, EncodingKey, Header};
use std::sync::Arc;
use uuid::Uuid;

use crate::config::Config;
use crate::db::repositories::UserRepository;
use crate::error::{AppError, Result};
use crate::models::{
    AuthResponse, Claims, LoginRequest, RegisterRequest, TokenResponse, User, UserPublic, UserRole,
};
use crate::services::password::{hash_password, verify_password};

pub struct AuthService {
    user_repo: UserRepository,
    config: Arc<Config>,
}

impl AuthService {
    pub fn new(user_repo: UserRepository, config: Arc<Config>) -> Self {
        Self { user_repo, config }
    }

    /// ユーザー登録
    pub async fn register(&self, req: RegisterRequest) -> Result<AuthResponse> {
        // メールアドレスの重複チェック
        if self.user_repo.email_exists(&req.email).await? {
            return Err(AppError::Conflict("このメールアドレスは既に登録されています".to_string()));
        }

        // パスワードハッシュ化
        let password_hash = hash_password(&req.password)?;

        // ユーザー作成
        let now = Utc::now();
        let user = User {
            id: Uuid::new_v4(),
            email: req.email.to_lowercase(),
            password_hash,
            name: req.name,
            phone: req.phone,
            is_active: true,
            is_verified: false,
            role: UserRole::User,
            created_at: now,
            updated_at: now,
            last_login_at: Some(now),
        };

        self.user_repo.create(&user).await?;

        // トークン生成
        let tokens = self.generate_tokens(&user)?;

        Ok(AuthResponse {
            user: UserPublic::from(user),
            tokens,
        })
    }

    /// ログイン
    pub async fn login(&self, req: LoginRequest) -> Result<AuthResponse> {
        let email = req.email.to_lowercase();

        // ユーザー取得
        let user = self
            .user_repo
            .find_by_email(&email)
            .await?
            .ok_or_else(|| AppError::Unauthorized("メールアドレスまたはパスワードが正しくありません".to_string()))?;

        // アカウント有効性チェック
        if !user.is_active {
            return Err(AppError::Unauthorized("アカウントが無効化されています".to_string()));
        }

        // パスワード検証
        if !verify_password(&req.password, &user.password_hash)? {
            return Err(AppError::Unauthorized("メールアドレスまたはパスワードが正しくありません".to_string()));
        }

        // トークン生成
        let tokens = self.generate_tokens(&user)?;

        Ok(AuthResponse {
            user: UserPublic::from(user),
            tokens,
        })
    }

    /// トークン更新
    pub async fn refresh_token(&self, user_id: Uuid) -> Result<TokenResponse> {
        let user = self
            .user_repo
            .find_by_id(user_id)
            .await?
            .ok_or_else(|| AppError::Unauthorized("ユーザーが見つかりません".to_string()))?;

        if !user.is_active {
            return Err(AppError::Unauthorized("アカウントが無効化されています".to_string()));
        }

        self.generate_tokens(&user)
    }

    /// JWTトークン生成
    fn generate_tokens(&self, user: &User) -> Result<TokenResponse> {
        let access_token = self.create_token(
            user.id,
            &user.email,
            &user.role,
            self.config.jwt.access_token_expiry,
            "access",
        )?;

        let refresh_token = self.create_token(
            user.id,
            &user.email,
            &user.role,
            self.config.jwt.refresh_token_expiry,
            "refresh",
        )?;

        Ok(TokenResponse::new(
            access_token,
            refresh_token,
            self.config.jwt.access_token_expiry,
        ))
    }

    /// 単一トークン作成
    fn create_token(
        &self,
        user_id: Uuid,
        email: &str,
        role: &UserRole,
        expires_in: i64,
        token_use: &'static str,
    ) -> Result<String> {
        let claims = Claims::new(user_id, email.to_string(), role.clone(), expires_in, token_use);

        let encoding_key = EncodingKey::from_secret(self.config.jwt.secret.as_bytes());

        encode(&Header::default(), &claims, &encoding_key)
            .map_err(|e| AppError::Internal(format!("Failed to create token: {}", e)))
    }
}
