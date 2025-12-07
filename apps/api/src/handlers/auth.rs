use axum::{extract::State, Extension, Json};
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::UserRepository;
use crate::error::{AppError, Result};
use crate::models::{
    AuthResponse, AuthenticatedUser, LoginRequest, RefreshTokenRequest, RegisterRequest, TokenResponse,
};
use crate::services::AuthService;

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

    Ok(Json(response))
}

/// ログアウト
pub async fn logout() -> Result<Json<serde_json::Value>> {
    // JWTはステートレスなので、サーバー側での無効化は不要
    // クライアント側でトークンを破棄する
    Ok(Json(serde_json::json!({ "message": "ログアウトしました" })))
}

/// トークン更新
pub async fn refresh_token(
    State(state): State<AppState>,
    Extension(user): Extension<AuthenticatedUser>,
    Json(_req): Json<RefreshTokenRequest>,
) -> Result<Json<TokenResponse>> {
    let user_repo = UserRepository::new(state.db.anonymous());
    let auth_service = AuthService::new(user_repo, state.config.clone());

    let tokens = auth_service.refresh_token(user.id).await?;

    Ok(Json(tokens))
}

/// パスワードリセット要求
pub async fn forgot_password(
    Json(_req): Json<crate::models::ForgotPasswordRequest>,
) -> Result<Json<serde_json::Value>> {
    // TODO: パスワードリセットメール送信実装
    Ok(Json(serde_json::json!({
        "message": "パスワードリセット用のメールを送信しました"
    })))
}

/// パスワードリセット実行
pub async fn reset_password(
    Json(_req): Json<crate::models::ResetPasswordRequest>,
) -> Result<Json<serde_json::Value>> {
    // TODO: パスワードリセット実装
    Ok(Json(serde_json::json!({
        "message": "パスワードを変更しました"
    })))
}
