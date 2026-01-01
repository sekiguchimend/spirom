use axum::{extract::State, Extension, Json};
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::Deserialize;
use serde_json::Value;
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::UserRepository;
use crate::error::{AppError, Result};
use crate::models::{AuthenticatedUser, CreateProfileRequest, DataResponse, User, UserPublic, UserRole};

/// プロファイル作成（Supabase Auth登録後にusersテーブルに追加）
pub async fn create_profile(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    Json(req): Json<CreateProfileRequest>,
) -> Result<Json<DataResponse<UserPublic>>> {
    req.validate()?;

    // RLS: auth.uid を通すためユーザーのJWTを利用
    let user_repo = UserRepository::new(state.db.with_auth(&token));

    // 既存ユーザーチェック
    if let Some(existing) = user_repo.find_by_id(auth_user.id).await? {
        // 既にプロファイルが存在する場合は更新
        let mut user = existing;
        user.name = req.name;
        user.phone = req.phone;
        user.updated_at = Utc::now();
        user_repo.update(&user).await?;
        return Ok(Json(DataResponse::new(UserPublic::from(user))));
    }

    // 新規プロファイル作成
    let now = Utc::now();
    let user = User {
        id: auth_user.id,
        email: auth_user.email.clone(),
        password_hash: String::new(), // Supabase Authが管理するため空
        name: req.name,
        phone: req.phone,
        is_active: true,
        is_verified: true, // Supabase Authで確認済み
        role: UserRole::User,
        created_at: now,
        updated_at: now,
        last_login_at: Some(now),
    };

    user_repo.create(&user).await?;

    Ok(Json(DataResponse::new(UserPublic::from(user))))
}

// =========================
// Supabase Auth ラッパー
// =========================

#[derive(Debug, Deserialize)]
struct SupabaseUser {
    id: String,
    email: String,
    created_at: String,
    #[serde(default)]
    user_metadata: Value,
    #[serde(default)]
    email_confirmed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SupabaseAuthResponse {
    access_token: String,
    refresh_token: String,
    expires_in: i64,
    token_type: String,
    user: SupabaseUser,
}

async fn supabase_auth_request(
    client: &Client,
    base_url: &str,
    auth_token: &str,
    path: &str,
    body: Value,
) -> std::result::Result<SupabaseAuthResponse, AppError> {
    let url = format!("{}/auth/v1/{}", base_url.trim_end_matches('/'), path);
    let res = client
        .post(url)
        .header("apikey", auth_token)
        .header("Authorization", format!("Bearer {}", auth_token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Auth request failed: {}", e)))?;

    if !res.status().is_success() {
        let txt = res.text().await.unwrap_or_default();
        return Err(AppError::Unauthorized(format!("Auth failed: {}", txt)));
    }

    res.json::<SupabaseAuthResponse>()
        .await
        .map_err(|e| AppError::Internal(format!("Auth parse failed: {}", e)))
}

fn user_public_from_supabase(repo_user: Option<User>, supa: &SupabaseUser) -> UserPublic {
    if let Some(u) = repo_user {
        return UserPublic::from(u);
    }

    let name = supa
        .user_metadata
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let phone = supa
        .user_metadata
        .get("phone")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    UserPublic {
        id: Uuid::parse_str(&supa.id).unwrap_or_else(|_| Uuid::nil()),
        email: supa.email.clone(),
        name,
        phone,
        is_verified: supa.email_confirmed_at.is_some(),
        created_at: supa.created_at.parse().unwrap_or_else(|_| Utc::now()),
    }
}

/// Supabase Auth: 新規登録（email/password）
pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<crate::models::RegisterRequest>,
) -> Result<Json<Value>> {
    req.validate()?;

    let client = Client::new();
    let body = serde_json::json!({
        "email": req.email,
        "password": req.password,
        "data": {
            "name": req.name,
            "phone": req.phone
        }
    });

    let auth_res = supabase_auth_request(
        &client,
        &state.config.database.url,
        &state.config.database.anon_key,
        "signup",
        body,
    )
    .await?;

    // public.users を service role で取得（トリガー同期後）
    let repo = UserRepository::new(state.db.service());
    let repo_user = repo
        .find_by_id(Uuid::parse_str(&auth_res.user.id).unwrap_or_else(|_| Uuid::nil()))
        .await
        .ok()
        .flatten();
    let user_public = user_public_from_supabase(repo_user, &auth_res.user);

    let response = serde_json::json!({
        "user": user_public,
        "tokens": {
            "access_token": auth_res.access_token,
            "refresh_token": auth_res.refresh_token,
            "token_type": auth_res.token_type,
            "expires_in": auth_res.expires_in
        }
    });

    Ok(Json(response))
}

/// Supabase Auth: ログイン
pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<crate::models::LoginRequest>,
) -> Result<Json<Value>> {
    req.validate()?;

    let client = Client::new();
    let body = serde_json::json!({
        "email": req.email,
        "password": req.password
    });

    let auth_res = supabase_auth_request(
        &client,
        &state.config.database.url,
        &state.config.database.anon_key,
        "token?grant_type=password",
        body,
    )
    .await?;

    let repo = UserRepository::new(state.db.service());
    let repo_user = repo
        .find_by_id(Uuid::parse_str(&auth_res.user.id).unwrap_or_else(|_| Uuid::nil()))
        .await
        .ok()
        .flatten();
    let user_public = user_public_from_supabase(repo_user, &auth_res.user);

    let response = serde_json::json!({
        "user": user_public,
        "tokens": {
            "access_token": auth_res.access_token,
            "refresh_token": auth_res.refresh_token,
            "token_type": auth_res.token_type,
            "expires_in": auth_res.expires_in
        }
    });

    Ok(Json(response))
}

/// Supabase Auth: リフレッシュ
pub async fn refresh_token(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<Value>> {
    let refresh_token = body
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::BadRequest("refresh_token is required".to_string()))?;

    let client = Client::new();
    let auth_res = supabase_auth_request(
        &client,
        &state.config.database.url,
        &state.config.database.anon_key,
        "token?grant_type=refresh_token",
        serde_json::json!({ "refresh_token": refresh_token }),
    )
    .await?;

    let repo = UserRepository::new(state.db.service());
    let repo_user = repo
        .find_by_id(Uuid::parse_str(&auth_res.user.id).unwrap_or_else(|_| Uuid::nil()))
        .await
        .ok()
        .flatten();
    let user_public = user_public_from_supabase(repo_user, &auth_res.user);

    let response = serde_json::json!({
        "user": user_public,
        "tokens": {
            "access_token": auth_res.access_token,
            "refresh_token": auth_res.refresh_token,
            "token_type": auth_res.token_type,
            "expires_in": auth_res.expires_in
        }
    });

    Ok(Json(response))
}
