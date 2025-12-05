use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Extension, Json,
};
use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::{CartRepository, ProductRepository};
use crate::error::{AppError, Result};
use crate::middleware::{extract_session_id, generate_session_id};
use crate::models::{
    AddToCartRequest, AuthenticatedUser, CartItem, CartResponse, DataResponse, MergeCartRequest,
    UpdateCartItemRequest,
};

/// セッションID取得またはヘッダーから抽出
fn get_session_id(headers: &HeaderMap) -> String {
    headers
        .get("X-Session-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(generate_session_id)
}

/// カート取得
pub async fn get_cart(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<DataResponse<CartResponse>>> {
    let session_id = get_session_id(&headers);
    let cart_repo = CartRepository::new(state.db.clone());

    let cart = cart_repo.find_by_session(&session_id).await?;

    Ok(Json(DataResponse::new(CartResponse::from(cart))))
}

/// カートに追加
pub async fn add_to_cart(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<AddToCartRequest>,
) -> Result<Json<DataResponse<CartResponse>>> {
    req.validate()?;

    let session_id = get_session_id(&headers);
    let cart_repo = CartRepository::new(state.db.clone());
    let product_repo = ProductRepository::new(state.db.clone());

    // 商品取得
    let product = product_repo
        .find_by_id(req.product_id)
        .await?
        .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

    if !product.is_active {
        return Err(AppError::BadRequest("この商品は現在販売されていません".to_string()));
    }

    if product.stock < req.quantity {
        return Err(AppError::BadRequest("在庫が不足しています".to_string()));
    }

    // 既存のカートを取得
    let existing_cart = cart_repo.find_by_session(&session_id).await?;

    // 既にカートにあるか確認
    let existing_item = existing_cart
        .items
        .iter()
        .find(|item| item.product_id == req.product_id);

    let new_quantity = if let Some(item) = existing_item {
        item.quantity + req.quantity
    } else {
        req.quantity
    };

    // カートアイテム作成
    let cart_item = CartItem {
        product_id: product.id,
        product_name: product.name.clone(),
        product_slug: product.slug.clone(),
        price: product.price,
        quantity: new_quantity,
        subtotal: product.price * new_quantity as i64,
        image_url: product.images.first().cloned(),
        added_at: Utc::now(),
    };

    cart_repo.add_item(&session_id, &cart_item).await?;

    // 更新後のカートを取得
    let cart = cart_repo.find_by_session(&session_id).await?;

    Ok(Json(DataResponse::new(CartResponse::from(cart))))
}

/// カートアイテム数量更新
pub async fn update_cart_item(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(product_id): Path<Uuid>,
    Json(req): Json<UpdateCartItemRequest>,
) -> Result<Json<DataResponse<CartResponse>>> {
    req.validate()?;

    let session_id = get_session_id(&headers);
    let cart_repo = CartRepository::new(state.db.clone());
    let product_repo = ProductRepository::new(state.db.clone());

    // 在庫確認
    let product = product_repo
        .find_by_id(product_id)
        .await?
        .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

    if product.stock < req.quantity {
        return Err(AppError::BadRequest("在庫が不足しています".to_string()));
    }

    cart_repo
        .update_quantity(&session_id, product_id, req.quantity)
        .await?;

    let cart = cart_repo.find_by_session(&session_id).await?;

    Ok(Json(DataResponse::new(CartResponse::from(cart))))
}

/// カートからアイテム削除
pub async fn remove_from_cart(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(product_id): Path<Uuid>,
) -> Result<Json<DataResponse<CartResponse>>> {
    let session_id = get_session_id(&headers);
    let cart_repo = CartRepository::new(state.db.clone());

    cart_repo.remove_item(&session_id, product_id).await?;

    let cart = cart_repo.find_by_session(&session_id).await?;

    Ok(Json(DataResponse::new(CartResponse::from(cart))))
}

/// カートクリア
pub async fn clear_cart(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>> {
    let session_id = get_session_id(&headers);
    let cart_repo = CartRepository::new(state.db.clone());

    cart_repo.clear(&session_id).await?;

    Ok(Json(serde_json::json!({ "message": "カートをクリアしました" })))
}

/// カート統合（ログイン時）
pub async fn merge_cart(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    headers: HeaderMap,
    Json(req): Json<MergeCartRequest>,
) -> Result<Json<DataResponse<CartResponse>>> {
    let user_session_id = get_session_id(&headers);
    let cart_repo = CartRepository::new(state.db.clone());

    cart_repo
        .merge(&req.guest_session_id, &user_session_id, auth_user.id)
        .await?;

    let cart = cart_repo.find_by_session(&user_session_id).await?;

    Ok(Json(DataResponse::new(CartResponse::from(cart))))
}
