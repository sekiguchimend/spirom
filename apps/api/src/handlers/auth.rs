use axum::{extract::State, Extension, Json};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::{UserRepository, TokenBlacklistRepository};
use crate::error::{AppError, Result};
use crate::models::{AuthResponse, AuthenticatedUser, LoginRequest, RefreshTokenRequest, RegisterRequest, TokenResponse, Claims};
use crate::services::AuthService;
use crate::services::password::hash_password;

/// ユーザー登録
pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>> {
    req.validate()?;

    let user_repo = UserRepository::new(state.db.anonymous());
    let auth_service = AuthService::new(user_repo, state.config.clone());

    let response = auth_service.register(req).await?;

    Ok(Json(response))
}

/// ログイン
pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>> {
    req.validate()?;

    let user_repo = UserRepository::new(state.db.anonymous());
    let auth_service = AuthService::new(user_repo, state.config.clone());

    let response = auth_service.login(req).await?;

    // 最終ログイン時刻更新（失敗してもログイン自体は成功させる）
    // RLSにより anon では更新できないため、可能なら service role で更新する
    {
        let user_repo_service = UserRepository::new(state.db.service());
        if let Err(e) = user_repo_service.update_last_login(response.user.id).await {
            tracing::warn!(
                "Failed to update last_login_at (non-fatal). user_id={}, err={}",
                response.user.id,
                e
            );
        }
    }

    Ok(Json(response))
}

/// ログアウト
pub async fn logout(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
) -> Result<Json<serde_json::Value>> {
    // トークンをブラックリストに追加
    let decoding_key = DecodingKey::from_secret(state.config.jwt.secret.as_bytes());
    let validation = Validation::default();

    if let Ok(token_data) = decode::<Claims>(&token, &decoding_key, &validation) {
        let blacklist_repo = TokenBlacklistRepository::new(state.db.service());

        // トークンの有効期限までブラックリストに保持
        let expires_at = chrono::DateTime::from_timestamp(token_data.claims.exp, 0)
            .unwrap_or_else(|| Utc::now() + Duration::hours(1));

        if let Err(e) = blacklist_repo.add(&token_data.claims.jti, auth_user.id, expires_at).await {
            // ブラックリスト追加に失敗してもログアウト自体は成功させる
            tracing::warn!("Failed to add token to blacklist: {}", e);
        }
    }

    Ok(Json(serde_json::json!({ "message": "ログアウトしました" })))
}

/// トークン更新
pub async fn refresh_token(
    State(state): State<AppState>,
    Json(req): Json<RefreshTokenRequest>,
) -> Result<Json<TokenResponse>> {
    req.validate()?;

    // refresh_token を検証して user_id を取り出す（Accessトークンは不要）
    let decoding_key = DecodingKey::from_secret(state.config.jwt.secret.as_bytes());
    let validation = Validation::default();
    let token_data = decode::<Claims>(&req.refresh_token, &decoding_key, &validation)
        .map_err(|_| AppError::Unauthorized("リフレッシュトークンが無効です".to_string()))?;

    if token_data.claims.token_use.as_deref() != Some("refresh") {
        return Err(AppError::Unauthorized(
            "リフレッシュトークンが無効です".to_string(),
        ));
    }

    let user_repo = UserRepository::new(state.db.anonymous());
    let auth_service = AuthService::new(user_repo, state.config.clone());

    let tokens = auth_service.refresh_token(token_data.claims.sub).await?;

    Ok(Json(tokens))
}

/// パスワードリセット要求
pub async fn forgot_password(
    State(state): State<AppState>,
    Json(req): Json<crate::models::ForgotPasswordRequest>,
) -> Result<Json<serde_json::Value>> {
    req.validate()?;

    // ユーザー存在の有無は外部に漏らさない（ユーザー列挙対策）
    let user_repo = UserRepository::new(state.db.anonymous());
    let user = user_repo.find_by_email(&req.email.to_lowercase()).await?;

    // dev/local のみ、動作確認用にトークンをレスポンスへ含められる（本番は絶対に返さない）
    let env = std::env::var("ENVIRONMENT").unwrap_or_else(|_| "production".to_string());
    let is_dev = env == "development" || env == "local";
    let return_token = std::env::var("PASSWORD_RESET_RETURN_TOKEN")
        .ok()
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    if let Some(u) = user {
        let claims = Claims::new(
            u.id,
            u.email.clone(),
            u.role.clone(),
            15 * 60, // 15分
            "password_reset",
        );
        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(state.config.jwt.secret.as_bytes()),
        )
        .map_err(|e| AppError::Internal(format!("Failed to create reset token: {}", e)))?;

        if is_dev && return_token {
            return Ok(Json(serde_json::json!({
                "message": "パスワードリセット用のメールを送信しました",
                "reset_token": token
            })));
        }

        // 本番はここでメール送信を行う想定（SMTP/外部メールサービス等）
        // 現状は「トークン発行」までを実装し、リセット自体は reset_password で完結させる。
        tracing::info!("Password reset requested (token generated). user_id={}", u.id);
    }

    Ok(Json(serde_json::json!({
        "message": "パスワードリセット用のメールを送信しました"
    })))
}

/// パスワードリセット実行
pub async fn reset_password(
    State(state): State<AppState>,
    Json(req): Json<crate::models::ResetPasswordRequest>,
) -> Result<Json<serde_json::Value>> {
    req.validate()?;

    // token を検証して user_id を取り出す
    let decoding_key = DecodingKey::from_secret(state.config.jwt.secret.as_bytes());
    let validation = Validation::default();
    let token_data = decode::<Claims>(&req.token, &decoding_key, &validation)
        .map_err(|_| AppError::Unauthorized("トークンが無効です".to_string()))?;

    if token_data.claims.token_use.as_deref() != Some("password_reset") {
        return Err(AppError::Unauthorized("トークンが無効です".to_string()));
    }

    // 新パスワードをハッシュ化して更新（RLS対策: service role）
    let password_hash = hash_password(&req.new_password)?;
    let user_repo = UserRepository::new(state.db.service());
    user_repo.update_password(token_data.claims.sub, &password_hash).await?;

    // パスワード変更時は全ての既存トークンを無効化（セキュリティ対策）
    let blacklist_repo = TokenBlacklistRepository::new(state.db.service());
    let expires_at = Utc::now() + Duration::days(30); // 最大リフレッシュトークン有効期間
    if let Err(e) = blacklist_repo.blacklist_all_user_tokens(token_data.claims.sub, expires_at).await {
        tracing::warn!("Failed to blacklist all user tokens: {}", e);
    }

    Ok(Json(serde_json::json!({
        "message": "パスワードを変更しました"
    })))
}
