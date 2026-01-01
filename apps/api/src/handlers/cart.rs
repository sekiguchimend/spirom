use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Extension, Json,
};
use chrono::Utc;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::{CartRepository, ProductRepository};
use crate::error::{AppError, Result};
use crate::middleware::generate_session_id;
use crate::models::{
    AddToCartRequest, AuthenticatedUser, CartItem, CartResponse, DataResponse, MergeCartRequest,
    UpdateCartItemRequest,
};

type HmacSha256 = Hmac<Sha256>;

// Authorization: Bearer ... を取り出す
fn extract_bearer(headers: &HeaderMap) -> Option<String> {
    headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .map(|s| s.to_string())
}

/// セッションIDの署名を生成
fn sign_session_id(session_id: &str, secret: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(session_id.as_bytes());
    let result = mac.finalize();
    hex::encode(result.into_bytes())
}

/// セッションIDの検証（HMAC署名チェック）
fn verify_session_id(session_id: &str, signature: &str, secret: &str) -> bool {
    // セッションIDのフォーマット検証（sess_uuid形式のみ許可）
    if !session_id.starts_with("sess_") || session_id.len() < 37 {
        return false;
    }

    // UUID部分の検証
    let uuid_part = &session_id[5..];
    if uuid_part.len() != 32 || !uuid_part.chars().all(|c| c.is_ascii_hexdigit()) {
        return false;
    }

    // HMAC署名検証（タイミングセーフ比較）
    let expected = sign_session_id(session_id, secret);

    // 定数時間比較
    if expected.len() != signature.len() {
        return false;
    }
    let mut diff: u8 = 0;
    for (a, b) in expected.bytes().zip(signature.bytes()) {
        diff |= a ^ b;
    }
    diff == 0
}

/// セッションID取得（署名付き検証）
fn get_verified_session_id(headers: &HeaderMap) -> Result<String> {
    let secret = std::env::var("SESSION_SECRET")
        .or_else(|_| std::env::var("JWT_SECRET"))
        .map_err(|_| AppError::Internal("SESSION_SECRET is not configured".to_string()))?;

    // ヘッダーからセッションIDと署名を取得
    let session_id = headers
        .get("X-Session-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    let signature = headers
        .get("X-Session-Signature")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    match (session_id, signature) {
        (Some(sid), Some(sig)) => {
            // 署名付きセッションIDの検証
            if verify_session_id(&sid, &sig, &secret) {
                Ok(sid)
            } else {
                // 署名が無効な場合は新しいセッションIDを生成
                // （攻撃者が他人のセッションを乗っ取ろうとした場合）
                tracing::warn!("Invalid session signature detected, generating new session");
                Ok(generate_session_id())
            }
        }
        _ => {
            // セッションIDがない場合は新規生成
            Ok(generate_session_id())
        }
    }
}

/// 新しいセッションIDと署名を生成
fn create_signed_session() -> Result<(String, String)> {
    let secret = std::env::var("SESSION_SECRET")
        .or_else(|_| std::env::var("JWT_SECRET"))
        .map_err(|_| AppError::Internal("SESSION_SECRET is not configured".to_string()))?;

    let session_id = generate_session_id();
    let signature = sign_session_id(&session_id, &secret);

    Ok((session_id, signature))
}

/// カート取得
pub async fn get_cart(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<DataResponse<CartResponse>>> {
    // auth.uid を使うため、認証トークンがあれば with_auth を、なければ anon を使う
    let token = extract_bearer(&headers);
    let client = match token {
        Some(t) => state.db.with_auth(&t),
        None => state.db.anonymous(),
    };

    let session_id = get_verified_session_id(&headers)?;
    let cart_repo = CartRepository::new(client);

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

    let token = extract_bearer(&headers);
    let client = match token {
        Some(t) => state.db.with_auth(&t),
        None => state.db.anonymous(),
    };

    let session_id = get_verified_session_id(&headers)?;
    let cart_repo = CartRepository::new(client.clone());
    let product_repo = ProductRepository::new(client.clone());

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

    // カートアイテム数上限チェック（DoS対策）
    const MAX_CART_ITEMS: usize = 50;
    let is_new_item = !existing_cart.items.iter().any(|item| item.product_id == req.product_id);
    if is_new_item && existing_cart.items.len() >= MAX_CART_ITEMS {
        return Err(AppError::BadRequest(format!(
            "カートに追加できる商品は最大{}種類までです",
            MAX_CART_ITEMS
        )));
    }

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

    let token = extract_bearer(&headers);
    let client = match token {
        Some(t) => state.db.with_auth(&t),
        None => state.db.anonymous(),
    };

    let session_id = get_verified_session_id(&headers)?;
    let cart_repo = CartRepository::new(client.clone());
    let product_repo = ProductRepository::new(client.clone());

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
    let token = extract_bearer(&headers);
    let client = match token {
        Some(t) => state.db.with_auth(&t),
        None => state.db.anonymous(),
    };

    let session_id = get_verified_session_id(&headers)?;
    let cart_repo = CartRepository::new(client);

    cart_repo.remove_item(&session_id, product_id).await?;

    let cart = cart_repo.find_by_session(&session_id).await?;

    Ok(Json(DataResponse::new(CartResponse::from(cart))))
}

/// カートクリア
pub async fn clear_cart(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>> {
    let token = extract_bearer(&headers);
    let client = match token {
        Some(t) => state.db.with_auth(&t),
        None => state.db.anonymous(),
    };

    let session_id = get_verified_session_id(&headers)?;
    let cart_repo = CartRepository::new(client);

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
    let user_session_id = get_verified_session_id(&headers)?;
    let cart_repo = CartRepository::new(state.db.service());

    // ゲストセッションIDも検証が必要
    // ただしマージ元は既存セッションなので、フォーマットのみ検証
    if !req.guest_session_id.starts_with("sess_") || req.guest_session_id.len() < 37 {
        return Err(AppError::BadRequest("無効なセッションIDです".to_string()));
    }

    cart_repo
        .merge(&req.guest_session_id, &user_session_id, auth_user.id)
        .await?;

    let cart = cart_repo.find_by_session(&user_session_id).await?;

    Ok(Json(DataResponse::new(CartResponse::from(cart))))
}
