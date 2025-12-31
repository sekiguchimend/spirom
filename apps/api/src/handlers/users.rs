use axum::{
    extract::{Path, State},
    Extension, Json,
};
use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::UserRepository;
use crate::error::{AppError, Result};
use crate::models::{
    Address, AuthenticatedUser, CreateAddressRequest, DataResponse, UpdateAddressRequest,
    UpdateUserRequest, UserPublic,
};

/// 自分の情報取得
pub async fn get_me(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
) -> Result<Json<DataResponse<UserPublic>>> {
    let user_repo = UserRepository::new(state.db.anonymous());

    let user = user_repo
        .find_by_id(auth_user.id)
        .await?
        .ok_or_else(|| AppError::NotFound("ユーザーが見つかりません".to_string()))?;

    Ok(Json(DataResponse::new(UserPublic::from(user))))
}

/// 自分の情報更新
pub async fn update_me(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Json(req): Json<UpdateUserRequest>,
) -> Result<Json<DataResponse<UserPublic>>> {
    req.validate()?;

    let user_repo = UserRepository::new(state.db.anonymous());

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
) -> Result<Json<DataResponse<Vec<Address>>>> {
    let user_repo = UserRepository::new(state.db.anonymous());

    let addresses = user_repo.find_addresses_by_user(auth_user.id).await?;

    Ok(Json(DataResponse::new(addresses)))
}

/// 住所追加
pub async fn create_address(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Json(mut req): Json<CreateAddressRequest>,
) -> Result<Json<DataResponse<Address>>> {
    // バリデーション
    req.validate()?;
    
    // サニタイゼーションと追加バリデーション
    req.sanitize_and_validate()
        .map_err(|e| AppError::BadRequest(e))?;

    let user_repo = UserRepository::new(state.db.anonymous());

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
    Path(id): Path<Uuid>,
    Json(mut req): Json<UpdateAddressRequest>,
) -> Result<Json<DataResponse<Address>>> {
    // バリデーション
    req.validate()?;
    
    // サニタイゼーションと追加バリデーション
    req.sanitize_and_validate()
        .map_err(|e| AppError::BadRequest(e))?;

    let user_repo = UserRepository::new(state.db.anonymous());

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
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    let user_repo = UserRepository::new(state.db.anonymous());

    // 存在確認
    user_repo
        .find_address(auth_user.id, id)
        .await?
        .ok_or_else(|| AppError::NotFound("住所が見つかりません".to_string()))?;

    user_repo.delete_address(auth_user.id, id).await?;

    Ok(Json(serde_json::json!({ "message": "住所を削除しました" })))
}
