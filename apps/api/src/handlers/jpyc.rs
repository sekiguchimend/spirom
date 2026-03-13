use axum::{
    extract::State,
    http::HeaderMap,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::{CartRepository, OrderRepository, ProductRepository, UserRepository};
use crate::error::{AppError, Result};
use crate::middleware::generate_session_id;
use crate::handlers::users::ensure_user_profile;
use crate::models::{
    AuthenticatedUser, DataResponse, Order, OrderAddress, OrderItem, OrderStatus,
    PaymentMethod, PaymentStatus,
    calculate_shipping_fee, calculate_tax, generate_order_number,
    generate_guest_access_token, guest_token_expiry, GuestShippingAddress,
};
use crate::services::payment::{JpycVerifier, get_jpyc_config};

/// JPYC決済情報取得レスポンス
#[derive(Debug, Serialize)]
pub struct JpycPaymentInfoResponse {
    /// 受取人ウォレットアドレス
    pub recipient_address: String,
    /// JPYCコントラクトアドレス
    pub contract_address: String,
    /// チェーンID（137 = Polygon）
    pub chain_id: i32,
    /// 必要な確認数
    pub required_confirmations: u64,
    /// 支払い金額（JPYC、円と同額）
    pub amount_jpyc: i64,
    /// 注文ID（事前作成された注文）
    pub order_id: Uuid,
    /// ゲストトークン（ゲスト注文の場合のみ）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub guest_token: Option<String>,
}

/// JPYC決済準備リクエスト（認証済みユーザー）
#[derive(Debug, Deserialize, Validate)]
pub struct PrepareJpycPaymentRequest {
    pub shipping_address_id: Uuid,
    pub billing_address_id: Option<Uuid>,
    #[validate(length(max = 500))]
    pub notes: Option<String>,
}

/// JPYC決済準備リクエスト（ゲスト）
#[derive(Debug, Deserialize, Validate)]
pub struct PrepareJpycPaymentGuestRequest {
    #[validate(nested)]
    pub shipping_address: GuestShippingAddress,
    #[validate(nested)]
    pub billing_address: Option<GuestShippingAddress>,
    #[validate(email)]
    pub email: Option<String>,
    #[validate(length(max = 500))]
    pub notes: Option<String>,
    pub items: Vec<JpycPaymentItem>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JpycPaymentItem {
    pub product_id: Uuid,
    pub quantity: i32,
    pub variant_id: Option<Uuid>,
    pub size: Option<String>,
}

/// JPYC決済検証リクエスト（認証済みユーザー用）
#[derive(Debug, Deserialize, Validate)]
pub struct VerifyJpycPaymentRequest {
    /// 注文ID
    pub order_id: Uuid,
    /// トランザクションハッシュ
    #[validate(length(equal = 66, message = "Transaction hash must be 66 characters"))]
    pub tx_hash: String,
}

/// JPYC決済検証リクエスト（ゲスト用）
#[derive(Debug, Deserialize, Validate)]
pub struct VerifyJpycPaymentGuestRequest {
    /// 注文ID
    pub order_id: Uuid,
    /// トランザクションハッシュ
    #[validate(length(equal = 66, message = "Transaction hash must be 66 characters"))]
    pub tx_hash: String,
    /// ゲストアクセストークン（注文作成時に発行されたもの）
    #[validate(length(min = 1, message = "Guest token is required"))]
    pub guest_token: String,
}

/// JPYC決済検証レスポンス
#[derive(Debug, Serialize)]
pub struct VerifyJpycPaymentResponse {
    pub success: bool,
    pub order_id: Uuid,
    pub order_number: String,
    pub confirmations: u64,
}

/// JPYC決済準備（認証済みユーザー）
/// 注文を事前作成し、支払い情報を返す
pub async fn prepare_jpyc_payment(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    headers: HeaderMap,
    Json(req): Json<PrepareJpycPaymentRequest>,
) -> Result<Json<DataResponse<JpycPaymentInfoResponse>>> {
    req.validate()?;

    // JPYC受取アドレスの設定確認
    let recipient_address = std::env::var("JPYC_RECIPIENT_ADDRESS")
        .map_err(|_| AppError::Internal("JPYC recipient address not configured".to_string()))?;

    // セッションIDを取得（カート用）
    let session_id = headers
        .get("X-Session-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(generate_session_id);

    // リポジトリ初期化
    let db_service = state.db.service();
    let cart_repo = CartRepository::new(db_service.clone());
    let product_repo = ProductRepository::new(db_service);
    let order_repo = OrderRepository::new(state.db.with_auth(&token));
    let user_repo = UserRepository::new(state.db.with_auth(&token));

    // カート取得
    let cart = cart_repo.find_by_session(&session_id).await?;
    if cart.items.is_empty() {
        return Err(AppError::BadRequest("Cart is empty".to_string()));
    }

    // ユーザープロファイル取得（名前など）
    let user = ensure_user_profile(&state, &auth_user, &token).await?;

    // 配送先住所取得
    let shipping_address = user_repo
        .find_address(auth_user.id, req.shipping_address_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Shipping address not found".to_string()))?;

    // 請求先住所取得（指定がなければNone）
    let billing_address = if let Some(billing_id) = req.billing_address_id {
        Some(
            user_repo
                .find_address(auth_user.id, billing_id)
                .await?
                .ok_or_else(|| AppError::NotFound("Billing address not found".to_string()))?,
        )
    } else {
        None
    };

    // 商品情報を一括取得
    let product_ids: Vec<_> = cart.items.iter().map(|i| i.product_id).collect();
    let products = product_repo.find_by_ids(&product_ids).await?;

    // 金額計算
    let mut subtotal: i64 = 0;
    let mut order_items: Vec<OrderItem> = Vec::new();

    for item in &cart.items {
        let product = products
            .get(&item.product_id)
            .ok_or_else(|| AppError::NotFound("Product not found".to_string()))?;

        let item_subtotal = product.price * item.quantity as i64;
        subtotal += item_subtotal;

        order_items.push(OrderItem {
            product_id: product.id,
            product_name: product.name.clone(),
            product_sku: product.sku.clone(),
            price: product.price,
            quantity: item.quantity,
            subtotal: item_subtotal,
            image_url: product.images.first().cloned(),
            variant_id: item.variant_id,
            size: item.size.clone(),
        });
    }

    let country_code = &shipping_address.country;
    let shipping_fee = calculate_shipping_fee(subtotal, country_code);
    let tax = calculate_tax(subtotal);
    let total = subtotal + shipping_fee + tax;

    // 注文を事前作成（pending_payment状態）
    let order_id = Uuid::new_v4();
    let order_number = generate_order_number();
    let now = chrono::Utc::now();

    let order = Order {
        id: order_id,
        user_id: Some(auth_user.id),
        order_number: order_number.clone(),
        status: OrderStatus::PendingPayment,
        items: order_items,
        subtotal,
        shipping_fee,
        tax,
        total,
        currency: "JPY".to_string(),
        shipping_address: OrderAddress::from_address(&shipping_address, user.name.clone()),
        billing_address: billing_address
            .map(|addr| OrderAddress::from_address(&addr, user.name.clone())),
        payment_method: PaymentMethod::Jpyc,
        payment_status: PaymentStatus::Pending,
        payment_id: None,
        notes: req.notes,
        created_at: now,
        updated_at: now,
        shipped_at: None,
        delivered_at: None,
        is_guest_order: false,
        guest_email: None,
        guest_name: None,
        guest_phone: None,
        guest_access_token_hash: None,
        guest_token_expires_at: None,
        crypto_tx_hash: None,
        crypto_chain_id: None,
        crypto_sender_address: None,
        crypto_confirmed_at: None,
    };

    order_repo.create(&order).await?;

    tracing::info!(
        order_id = %order_id,
        total = %total,
        "JPYC payment prepared"
    );

    let jpyc_config = get_jpyc_config();

    Ok(Json(DataResponse {
        data: JpycPaymentInfoResponse {
            recipient_address,
            contract_address: jpyc_config.contract_address,
            chain_id: jpyc_config.chain_id,
            required_confirmations: jpyc_config.required_confirmations,
            amount_jpyc: total,
            order_id,
            guest_token: None,
        },
    }))
}

/// JPYC決済準備（ゲスト）
pub async fn prepare_jpyc_payment_guest(
    State(state): State<AppState>,
    Json(req): Json<PrepareJpycPaymentGuestRequest>,
) -> Result<Json<DataResponse<JpycPaymentInfoResponse>>> {
    req.validate()?;

    if req.items.is_empty() {
        return Err(AppError::BadRequest("No items provided".to_string()));
    }

    // JPYC受取アドレスの設定確認
    let recipient_address = std::env::var("JPYC_RECIPIENT_ADDRESS")
        .map_err(|_| AppError::Internal("JPYC recipient address not configured".to_string()))?;

    let product_repo = ProductRepository::new(state.db.service());
    let order_repo = OrderRepository::new(state.db.service());

    // 金額計算
    let mut subtotal: i64 = 0;
    let mut order_items: Vec<OrderItem> = Vec::new();

    for item in &req.items {
        let product = product_repo
            .find_by_id(item.product_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Product not found".to_string()))?;

        let item_subtotal = product.price * item.quantity as i64;
        subtotal += item_subtotal;

        order_items.push(OrderItem {
            product_id: product.id,
            product_name: product.name.clone(),
            product_sku: product.sku.clone(),
            price: product.price,
            quantity: item.quantity,
            subtotal: item_subtotal,
            image_url: product.images.first().cloned(),
            variant_id: item.variant_id,
            size: item.size.clone(),
        });
    }

    let country_code = &req.shipping_address.country;
    let shipping_fee = calculate_shipping_fee(subtotal, country_code);
    let tax = calculate_tax(subtotal);
    let total = subtotal + shipping_fee + tax;

    // ゲストアクセストークン生成
    let (guest_token, guest_token_hash) = generate_guest_access_token();

    // 注文を事前作成
    let order_id = Uuid::new_v4();
    let order_number = generate_order_number();

    let order = Order {
        id: order_id,
        user_id: None,
        order_number: order_number.clone(),
        status: OrderStatus::PendingPayment,
        items: order_items,
        subtotal,
        shipping_fee,
        tax,
        total,
        currency: "JPY".to_string(),
        shipping_address: req.shipping_address.to_order_address(),
        billing_address: req.billing_address.as_ref().map(|a| a.to_order_address()),
        payment_method: PaymentMethod::Jpyc,
        payment_status: PaymentStatus::Pending,
        payment_id: None,
        notes: req.notes,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        shipped_at: None,
        delivered_at: None,
        is_guest_order: true,
        guest_email: req.email.clone(),
        guest_name: Some(req.shipping_address.name.clone()),
        guest_phone: Some(req.shipping_address.phone.clone()),
        guest_access_token_hash: Some(guest_token_hash),
        guest_token_expires_at: Some(guest_token_expiry()),
        crypto_tx_hash: None,
        crypto_chain_id: None,
        crypto_sender_address: None,
        crypto_confirmed_at: None,
    };

    order_repo.create(&order).await?;

    tracing::info!(
        order_id = %order_id,
        total = %total,
        is_guest = true,
        "JPYC payment prepared for guest"
    );

    let jpyc_config = get_jpyc_config();

    Ok(Json(DataResponse {
        data: JpycPaymentInfoResponse {
            recipient_address,
            contract_address: jpyc_config.contract_address,
            chain_id: jpyc_config.chain_id,
            required_confirmations: jpyc_config.required_confirmations,
            amount_jpyc: total,
            order_id,
            guest_token: Some(guest_token),
        },
    }))
}

/// JPYC決済検証（認証済みユーザー用）
/// クライアントからtx_hashを受け取り、バックエンドで検証
pub async fn verify_jpyc_payment(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Json(req): Json<VerifyJpycPaymentRequest>,
) -> Result<Json<DataResponse<VerifyJpycPaymentResponse>>> {
    req.validate()?;

    // tx_hashフォーマット検証（0xで始まる66文字）
    if !req.tx_hash.starts_with("0x") || req.tx_hash.len() != 66 {
        return Err(AppError::BadRequest("Invalid transaction hash format".to_string()));
    }

    // JPYC受取アドレス
    let recipient_address = std::env::var("JPYC_RECIPIENT_ADDRESS")
        .map_err(|_| AppError::Internal("JPYC recipient address not configured".to_string()))?;

    let order_repo = OrderRepository::new(state.db.service());

    // 注文取得
    let order = order_repo
        .find_by_id(req.order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    // 所有者確認: 注文が認証ユーザーのものか確認
    match order.user_id {
        Some(user_id) if user_id == auth_user.id => {
            // OK: 注文は認証ユーザーのもの
        }
        _ => {
            // 他人の注文またはゲスト注文は認証ユーザーからはアクセス不可
            tracing::warn!(
                order_id = %req.order_id,
                auth_user_id = %auth_user.id,
                "Unauthorized JPYC payment verification attempt"
            );
            return Err(AppError::Forbidden("You don't have access to this order".to_string()));
        }
    }

    // 注文が支払い待ち状態か確認
    if order.status != OrderStatus::PendingPayment {
        return Err(AppError::BadRequest("Order is not pending payment".to_string()));
    }

    // JPYC決済方法か確認
    if order.payment_method != PaymentMethod::Jpyc {
        return Err(AppError::BadRequest("Order is not a JPYC payment".to_string()));
    }

    // 同じtx_hashが既に使用されていないか確認（二重使用防止）
    let existing_order = order_repo.get_by_crypto_tx_hash(&req.tx_hash).await?;
    if existing_order.is_some() {
        return Err(AppError::BadRequest("Transaction hash already used".to_string()));
    }

    // トランザクション検証
    let verifier = JpycVerifier::new(recipient_address);
    let verified_tx = verifier
        .verify_transaction(&req.tx_hash, order.total)
        .await
        .map_err(|e| {
            tracing::warn!(
                order_id = %req.order_id,
                tx_hash = %req.tx_hash,
                error = %e,
                "JPYC transaction verification failed"
            );
            AppError::BadRequest(format!("Transaction verification failed: {}", e))
        })?;

    // 冪等性確保：DBにイベント記録
    let event_result = order_repo
        .record_jpyc_payment_event(
            &verified_tx.tx_hash,
            verified_tx.chain_id,
            &verified_tx.sender_address,
            &verified_tx.recipient_address,
            &verified_tx.amount_wei,
            verified_tx.amount_jpyc,
            verified_tx.block_number as i64,
            &verified_tx.block_hash,
            verified_tx.confirmations as i32,
        )
        .await?;

    // 既に処理済みならエラー（冪等性）
    if !event_result.is_new {
        return Err(AppError::BadRequest("Transaction already processed".to_string()));
    }

    // 注文更新
    order_repo
        .update_jpyc_payment(
            req.order_id,
            &verified_tx.tx_hash,
            verified_tx.chain_id,
            &verified_tx.sender_address,
        )
        .await?;

    // Note: カートは注文作成時にフロントエンド側でクリアする
    // verify時点ではsession_idがないためバックエンドでのクリアは不可

    tracing::info!(
        order_id = %req.order_id,
        tx_hash = %req.tx_hash,
        amount_jpyc = %verified_tx.amount_jpyc,
        confirmations = %verified_tx.confirmations,
        "JPYC payment verified and order updated"
    );

    Ok(Json(DataResponse {
        data: VerifyJpycPaymentResponse {
            success: true,
            order_id: req.order_id,
            order_number: order.order_number,
            confirmations: verified_tx.confirmations,
        },
    }))
}

/// JPYC決済検証（ゲスト用）
/// ゲストトークンで所有権を検証してから決済を検証
pub async fn verify_jpyc_payment_guest(
    State(state): State<AppState>,
    Json(req): Json<VerifyJpycPaymentGuestRequest>,
) -> Result<Json<DataResponse<VerifyJpycPaymentResponse>>> {
    req.validate()?;

    // tx_hashフォーマット検証（0xで始まる66文字）
    if !req.tx_hash.starts_with("0x") || req.tx_hash.len() != 66 {
        return Err(AppError::BadRequest("Invalid transaction hash format".to_string()));
    }

    // JPYC受取アドレス
    let recipient_address = std::env::var("JPYC_RECIPIENT_ADDRESS")
        .map_err(|_| AppError::Internal("JPYC recipient address not configured".to_string()))?;

    let order_repo = OrderRepository::new(state.db.service());

    // 注文取得
    let order = order_repo
        .find_by_id(req.order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    // ゲスト注文かどうか確認
    if !order.is_guest_order {
        return Err(AppError::BadRequest("This endpoint is for guest orders only".to_string()));
    }

    // ゲストトークン検証
    let token_hash = order.guest_access_token_hash.as_ref()
        .ok_or_else(|| AppError::Forbidden("No guest token found for this order".to_string()))?;

    let token_expires = order.guest_token_expires_at
        .ok_or_else(|| AppError::Forbidden("Guest token has no expiry".to_string()))?;

    // トークンの有効性を検証（ハッシュ比較 + 有効期限）
    use crate::models::verify_guest_token;
    if !verify_guest_token(&req.guest_token, token_hash) {
        tracing::warn!(
            order_id = %req.order_id,
            "Invalid guest token for JPYC payment verification"
        );
        return Err(AppError::Forbidden("Invalid guest token".to_string()));
    }

    if token_expires < chrono::Utc::now() {
        return Err(AppError::Forbidden("Guest token has expired".to_string()));
    }

    // 注文が支払い待ち状態か確認
    if order.status != OrderStatus::PendingPayment {
        return Err(AppError::BadRequest("Order is not pending payment".to_string()));
    }

    // JPYC決済方法か確認
    if order.payment_method != PaymentMethod::Jpyc {
        return Err(AppError::BadRequest("Order is not a JPYC payment".to_string()));
    }

    // 同じtx_hashが既に使用されていないか確認（二重使用防止）
    let existing_order = order_repo.get_by_crypto_tx_hash(&req.tx_hash).await?;
    if existing_order.is_some() {
        return Err(AppError::BadRequest("Transaction hash already used".to_string()));
    }

    // トランザクション検証
    let verifier = JpycVerifier::new(recipient_address);
    let verified_tx = verifier
        .verify_transaction(&req.tx_hash, order.total)
        .await
        .map_err(|e| {
            tracing::warn!(
                order_id = %req.order_id,
                tx_hash = %req.tx_hash,
                error = %e,
                "JPYC transaction verification failed (guest)"
            );
            AppError::BadRequest(format!("Transaction verification failed: {}", e))
        })?;

    // 冪等性確保：DBにイベント記録
    let event_result = order_repo
        .record_jpyc_payment_event(
            &verified_tx.tx_hash,
            verified_tx.chain_id,
            &verified_tx.sender_address,
            &verified_tx.recipient_address,
            &verified_tx.amount_wei,
            verified_tx.amount_jpyc,
            verified_tx.block_number as i64,
            &verified_tx.block_hash,
            verified_tx.confirmations as i32,
        )
        .await?;

    // 既に処理済みならエラー（冪等性）
    if !event_result.is_new {
        return Err(AppError::BadRequest("Transaction already processed".to_string()));
    }

    // 注文更新
    order_repo
        .update_jpyc_payment(
            req.order_id,
            &verified_tx.tx_hash,
            verified_tx.chain_id,
            &verified_tx.sender_address,
        )
        .await?;

    tracing::info!(
        order_id = %req.order_id,
        tx_hash = %req.tx_hash,
        amount_jpyc = %verified_tx.amount_jpyc,
        confirmations = %verified_tx.confirmations,
        is_guest = true,
        "JPYC payment verified for guest order"
    );

    Ok(Json(DataResponse {
        data: VerifyJpycPaymentResponse {
            success: true,
            order_id: req.order_id,
            order_number: order.order_number,
            confirmations: verified_tx.confirmations,
        },
    }))
}

/// JPYC支払い情報取得（フロントエンド用）
pub async fn get_jpyc_payment_info(
    State(_state): State<AppState>,
) -> Result<Json<DataResponse<serde_json::Value>>> {
    let recipient_address = std::env::var("JPYC_RECIPIENT_ADDRESS")
        .map_err(|_| AppError::Internal("JPYC recipient address not configured".to_string()))?;

    let jpyc_config = get_jpyc_config();

    Ok(Json(DataResponse {
        data: serde_json::json!({
            "recipient_address": recipient_address,
            "contract_address": jpyc_config.contract_address,
            "chain_id": jpyc_config.chain_id,
            "required_confirmations": jpyc_config.required_confirmations,
        }),
    }))
}
