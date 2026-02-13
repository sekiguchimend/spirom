use axum::{
    extract::{Path, State},
    Extension, Json,
};
use chrono::Utc;
use reqwest::Client;
use serde::Deserialize;
use serde_json::Value;
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::UserRepository;
use crate::error::{AppError, Result};
use crate::models::{
    Address, AuthenticatedUser, CreateAddressRequest, DataResponse, UpdateAddressRequest,
    UpdateUserRequest, User, UserPublic, UserRole,
};

/// Supabase Auth のユーザー情報
#[derive(Debug, Deserialize)]
struct SupabaseAuthUser {
    id: String,
    email: String,
    created_at: String,
    #[serde(default)]
    user_metadata: Value,
    #[serde(default)]
    email_confirmed_at: Option<String>,
}

/// Supabase Auth から現在のユーザー情報を取得
async fn fetch_supabase_auth_user(base_url: &str, anon_key: &str, token: &str) -> Result<SupabaseAuthUser> {
    let url = format!("{}/auth/v1/user", base_url.trim_end_matches('/'));

    let res = Client::new()
        .get(url)
        .header("apikey", anon_key)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| AppError::Unauthorized(format!("Supabase user fetch failed: {}", e)))?;

    if !res.status().is_success() {
        let body = res.text().await.unwrap_or_default();
        return Err(AppError::Unauthorized(format!("Supabase user fetch failed: {}", body)));
    }

    res.json::<SupabaseAuthUser>()
        .await
        .map_err(|e| AppError::Unauthorized(format!("Supabase user parse failed: {}", e)))
}

/// usersテーブルに存在しない場合でも、Supabase Auth から取得して作成して返す
pub async fn ensure_user_profile(
    state: &AppState,
    auth_user: &AuthenticatedUser,
    token: &str,
) -> Result<User> {
    // RLSを確実に通すため、ユーザー自身のJWTでアクセス
    let repo = UserRepository::new(state.db.with_auth(token));

    if let Some(user) = repo.find_by_id(auth_user.id).await? {
        return Ok(user);
    }

    // Supabase Auth からユーザー情報を取得し、足りない場合は空文字で補完
    let supa_user = fetch_supabase_auth_user(
        &state.config.database.url,
        &state.config.database.anon_key,
        token,
    )
    .await?;

    let now = Utc::now();
    let name = supa_user
        .user_metadata
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let phone = supa_user
        .user_metadata
        .get("phone")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let user = User {
        id: auth_user.id,
        email: supa_user.email,
        password_hash: String::new(),
        name,
        phone,
        is_active: true,
        is_verified: supa_user.email_confirmed_at.is_some(),
        role: auth_user.role,
        created_at: supa_user
            .created_at
            .parse()
            .unwrap_or_else(|_| now),
        updated_at: now,
        last_login_at: Some(now),
    };

    repo.create(&user).await
}

/// 自分の情報取得
pub async fn get_me(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
) -> Result<Json<DataResponse<UserPublic>>> {
    let user = ensure_user_profile(&state, &auth_user, &token).await?;

    Ok(Json(DataResponse::new(UserPublic::from(user))))
}

/// 自分の情報更新
pub async fn update_me(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    Json(req): Json<UpdateUserRequest>,
) -> Result<Json<DataResponse<UserPublic>>> {
    req.validate()?;

    // プロファイルがまだ存在しない場合は作成してから更新に進む
    ensure_user_profile(&state, &auth_user, &token).await?;

    let user_repo = UserRepository::new(state.db.with_auth(&token));

    let mut user = user_repo
        .find_by_id(auth_user.id)
        .await?
        .ok_or_else(|| AppError::NotFound("ユーザーが見つかりません".to_string()))?;

    // 更新
    if let Some(name) = req.name {
        user.name = name;
    }
    if let Some(phone) = req.phone {
        user.phone = Some(phone);
    }
    user.updated_at = Utc::now();

    user_repo.update(&user).await?;

    Ok(Json(DataResponse::new(UserPublic::from(user))))
}

/// 住所一覧取得
pub async fn list_addresses(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
) -> Result<Json<DataResponse<Vec<Address>>>> {
    let user_repo = UserRepository::new(state.db.with_auth(&token));

    let addresses = user_repo.find_addresses_by_user(auth_user.id).await?;

    Ok(Json(DataResponse::new(addresses)))
}

/// 住所追加
pub async fn create_address(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    Json(mut req): Json<CreateAddressRequest>,
) -> Result<Json<DataResponse<Address>>> {
    // バリデーション
    req.validate()?;
    
    // サニタイゼーションと追加バリデーション
    req.sanitize_and_validate()
        .map_err(|e| AppError::BadRequest(e))?;

    let user_repo = UserRepository::new(state.db.with_auth(&token));

    let address = Address {
        id: Uuid::new_v4(),
        user_id: auth_user.id,
        label: req.label,
        postal_code: req.postal_code,
        prefecture: req.prefecture,
        city: req.city,
        address_line1: req.address_line1,
        address_line2: req.address_line2,
        phone: req.phone,
        is_default: req.is_default,
        created_at: Utc::now(),
    };

    user_repo.create_address(&address).await?;

    Ok(Json(DataResponse::new(address)))
}

/// 住所更新
pub async fn update_address(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    Path(id): Path<Uuid>,
    Json(mut req): Json<UpdateAddressRequest>,
) -> Result<Json<DataResponse<Address>>> {
    // バリデーション
    req.validate()?;
    
    // サニタイゼーションと追加バリデーション
    req.sanitize_and_validate()
        .map_err(|e| AppError::BadRequest(e))?;

    let user_repo = UserRepository::new(state.db.with_auth(&token));

    let mut address = user_repo
        .find_address(auth_user.id, id)
        .await?
        .ok_or_else(|| AppError::NotFound("住所が見つかりません".to_string()))?;

    // 更新
    if let Some(label) = req.label {
        address.label = Some(label);
    }
    if let Some(postal_code) = req.postal_code {
        address.postal_code = postal_code;
    }
    if let Some(prefecture) = req.prefecture {
        address.prefecture = prefecture;
    }
    if let Some(city) = req.city {
        address.city = city;
    }
    if let Some(address_line1) = req.address_line1 {
        address.address_line1 = address_line1;
    }
    if let Some(address_line2) = req.address_line2 {
        address.address_line2 = Some(address_line2);
    }
    if let Some(phone) = req.phone {
        address.phone = Some(phone);
    }
    if let Some(is_default) = req.is_default {
        address.is_default = is_default;
    }

    // 削除してから再作成（ScyllaDBの更新パターン）
    user_repo.delete_address(auth_user.id, id).await?;
    user_repo.create_address(&address).await?;

    Ok(Json(DataResponse::new(address)))
}

/// 住所削除
pub async fn delete_address(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    let user_repo = UserRepository::new(state.db.with_auth(&token));

    // 存在確認
    user_repo
        .find_address(auth_user.id, id)
        .await?
        .ok_or_else(|| AppError::NotFound("住所が見つかりません".to_string()))?;

    user_repo.delete_address(auth_user.id, id).await?;

    Ok(Json(serde_json::json!({ "message": "住所を削除しました" })))
}

// ========== 管理者専用エンドポイント ==========

/// ユーザー一覧取得（管理者専用）
pub async fn list_users_admin(
    State(state): State<AppState>,
) -> Result<Json<DataResponse<Vec<UserPublic>>>> {
    let user_repo = UserRepository::new(state.db.service());

    let users = user_repo.find_all(100).await?;
    let users_public: Vec<UserPublic> = users.into_iter().map(UserPublic::from).collect();

    Ok(Json(DataResponse::new(users_public)))
}

/// ユーザーロール更新リクエスト
#[derive(Debug, Deserialize)]
pub struct UpdateUserRoleRequest {
    pub role: String,
}

/// ユーザー情報更新（管理者専用）
pub async fn update_user_admin(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateUserRoleRequest>,
) -> Result<Json<DataResponse<UserPublic>>> {
    let user_repo = UserRepository::new(state.db.service());

    let mut user = user_repo
        .find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("ユーザーが見つかりません".to_string()))?;

    // ロール更新
    user.role = match req.role.as_str() {
        "admin" => UserRole::Admin,
        "customer" | "user" => UserRole::User,
        _ => return Err(AppError::BadRequest("無効なロールです".to_string())),
    };
    user.updated_at = Utc::now();

    user_repo.update(&user).await?;

    Ok(Json(DataResponse::new(UserPublic::from(user))))
}
