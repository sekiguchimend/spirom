use axum::{
    extract::State,
    http::StatusCode,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::{CartRepository, OrderRepository, ProductRepository, UserRepository};
use crate::middleware::generate_session_id;
use crate::handlers::users::ensure_user_profile;
use crate::error::{AppError, Result};
use crate::models::{
    AuthenticatedUser, DataResponse, Order, OrderAddress, OrderItem, OrderStatus, PaymentMethod, PaymentStatus, UserRole,
    calculate_shipping_fee, calculate_tax, generate_order_number,
    generate_guest_access_token, guest_token_expiry, GuestShippingAddress,
};
use crate::services::payment::{
    CreateIntentParams, PaymentProvider, ShippingAddress, StripePaymentProvider, WebhookEventType,
};

fn stripe_event_summary(event: &crate::services::payment::WebhookEvent) -> serde_json::Value {
    // PIIや巨大payloadを避け、検証に必要な最小限だけ保存する
    // - amount/currency/status は PaymentIntent から取得
    let obj = &event.data["data"]["object"];
    serde_json::json!({
        "id": event.event_id,
        "type": event.data["type"].as_str().unwrap_or(""),
        "created": event.data["created"].as_i64().unwrap_or(0),
        "livemode": event.data["livemode"].as_bool().unwrap_or(false),
        "payment_intent_id": event.payment_id,
        "order_id": event.order_id.map(|id| id.to_string()),
        "payment_intent": {
            "status": obj["status"].as_str().unwrap_or(""),
            "amount": obj["amount"].as_i64().unwrap_or(0),
            "currency": obj["currency"].as_str().unwrap_or(""),
        }
    })
}

/// PaymentIntent作成リクエスト（注文作成前）
/// 支払い完了後にWebhookで注文が作成される
#[derive(Debug, Deserialize, Validate)]
pub struct CreatePaymentIntentRequest {
    /// 配送先住所ID
    pub shipping_address_id: Uuid,
    /// 請求先住所ID（指定しない場合は配送先と同じ）
    pub billing_address_id: Option<Uuid>,
    /// 決済方法
    pub payment_method: PaymentMethod,
    /// 備考
    #[validate(length(max = 500))]
    pub notes: Option<String>,
}

/// PaymentIntent metadataに保存する注文アイテム
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentMetadataItem {
    pub product_id: Uuid,
    pub quantity: i32,
    #[serde(default)]
    pub variant_id: Option<Uuid>,
    #[serde(default)]
    pub size: Option<String>,
}

/// PaymentIntent作成レスポンス
#[derive(Debug, Serialize)]
pub struct CreatePaymentIntentResponse {
    pub client_secret: String,
    pub payment_intent_id: String,
    pub order_id: Uuid,
}

/// PaymentIntent作成（注文は作成しない、支払い完了後にWebhookで注文作成）
pub async fn create_payment_intent(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreatePaymentIntentRequest>,
) -> Result<Json<DataResponse<CreatePaymentIntentResponse>>> {
    req.validate()?;

    let session_id = headers
        .get("X-Session-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(generate_session_id);

    tracing::info!(
        "create_payment_intent: session_id={}, has_signature={}",
        &session_id[..session_id.len().min(15)],
        headers.get("X-Session-Signature").is_some()
    );

    let auth_client = state.db.with_auth(&token);
    let cart_repo = CartRepository::new(auth_client.clone());
    let product_repo = ProductRepository::new(auth_client.clone());
    let user_repo = UserRepository::new(auth_client.clone());

    // カート取得
    let cart = cart_repo.find_by_session(&session_id).await?;
    tracing::info!(
        "create_payment_intent: cart items={}, session={}",
        cart.items.len(),
        &session_id[..session_id.len().min(15)]
    );
    if cart.items.is_empty() {
        return Err(AppError::BadRequest("カートが空です".to_string()));
    }

    // ユーザー情報取得
    let user = ensure_user_profile(&state, &auth_user, &token).await?;

    // 配送先住所取得
    let shipping_address = user_repo
        .find_address(auth_user.id, req.shipping_address_id)
        .await?
        .ok_or_else(|| AppError::NotFound("配送先住所が見つかりません".to_string()))?;

    // 請求先住所取得
    let billing_address = if let Some(billing_id) = req.billing_address_id {
        Some(
            user_repo
                .find_address(auth_user.id, billing_id)
                .await?
                .ok_or_else(|| AppError::NotFound("請求先住所が見つかりません".to_string()))?,
        )
    } else {
        None
    };

    // 商品情報取得・金額計算
    let product_ids: Vec<_> = cart.items.iter().map(|i| i.product_id).collect();
    let products = product_repo.find_by_ids(&product_ids).await?;

    let mut items_for_metadata: Vec<PaymentMetadataItem> = Vec::new();
    let mut subtotal = 0i64;

    for cart_item in &cart.items {
        let product = products
            .get(&cart_item.product_id)
            .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

        if !product.is_active {
            return Err(AppError::BadRequest(format!(
                "「{}」は現在販売されていません",
                product.name
            )));
        }

        // 在庫確認（予約はWebhookで行う）
        if product.stock < cart_item.quantity {
            return Err(AppError::BadRequest(format!(
                "「{}」の在庫が不足しています",
                product.name
            )));
        }

        let item_price = product.price;
        subtotal += item_price * cart_item.quantity as i64;

        items_for_metadata.push(PaymentMetadataItem {
            product_id: cart_item.product_id,
            quantity: cart_item.quantity,
            variant_id: cart_item.variant_id,
            size: cart_item.size.clone(),
        });
    }

    // 金額計算
    let shipping_fee = calculate_shipping_fee(subtotal, &shipping_address.country);
    let tax = calculate_tax(subtotal);
    let total = subtotal + shipping_fee + tax;

    // Stripe PaymentIntent作成
    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();
    let webhook_secrets = std::env::var("STRIPE_WEBHOOK_SECRETS").ok();

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret, webhook_secrets);

    // metadataに注文作成に必要な情報を含める
    let mut metadata = std::collections::HashMap::new();
    metadata.insert("user_id".to_string(), auth_user.id.to_string());
    metadata.insert("user_name".to_string(), user.name.clone());
    metadata.insert("shipping_address_id".to_string(), req.shipping_address_id.to_string());
    if let Some(billing_id) = req.billing_address_id {
        metadata.insert("billing_address_id".to_string(), billing_id.to_string());
    }
    metadata.insert("payment_method".to_string(), format!("{}", req.payment_method));
    if let Some(ref notes) = req.notes {
        metadata.insert("notes".to_string(), notes.clone());
    }
    // カート情報をJSONで保存
    let items_json = serde_json::to_string(&items_for_metadata)
        .map_err(|_| AppError::Internal("カート情報のシリアライズに失敗しました".to_string()))?;
    metadata.insert("items".to_string(), items_json);
    // 金額情報
    metadata.insert("subtotal".to_string(), subtotal.to_string());
    metadata.insert("shipping_fee".to_string(), shipping_fee.to_string());
    metadata.insert("tax".to_string(), tax.to_string());
    // 配送先情報
    let shipping_addr_json = serde_json::json!({
        "name": user.name,
        "country": shipping_address.country,
        "postal_code": shipping_address.postal_code,
        "prefecture": shipping_address.prefecture,
        "city": shipping_address.city,
        "address_line1": shipping_address.address_line1,
        "address_line2": shipping_address.address_line2,
        "phone": shipping_address.phone,
    });
    metadata.insert("shipping_address".to_string(), shipping_addr_json.to_string());
    // 請求先情報
    if let Some(ref billing) = billing_address {
        let billing_addr_json = serde_json::json!({
            "name": user.name,
            "country": billing.country,
            "postal_code": billing.postal_code,
            "prefecture": billing.prefecture,
            "city": billing.city,
            "address_line1": billing.address_line1,
            "address_line2": billing.address_line2,
            "phone": billing.phone,
        });
        metadata.insert("billing_address".to_string(), billing_addr_json.to_string());
    }

    // Stripe用の配送先住所情報を作成
    let stripe_shipping_address = ShippingAddress {
        name: user.name.clone(),
        postal_code: shipping_address.postal_code.clone(),
        prefecture: shipping_address.prefecture.clone(),
        city: shipping_address.city.clone(),
        address_line1: shipping_address.address_line1.clone(),
        address_line2: shipping_address.address_line2.clone(),
        phone: shipping_address.phone.clone(),
    };

    // 冪等性キー: 各PaymentIntent作成試行に対してユニークなUUIDを使用
    // Stripe推奨: V4 UUIDまたは十分なエントロピーを持つランダム文字列
    // 同一購入の再試行はclient_secretを再利用すべき（フロントエンド側で管理）
    let idempotency_key = format!("pi_{}", Uuid::new_v4());

    let params = CreateIntentParams {
        order_id: Uuid::new_v4(), // 仮のID（実際の注文はWebhookで作成）
        amount: total,
        currency: "JPY".to_string(),
        customer_email: auth_user.email.clone(),
        customer_name: Some(user.name.clone()),
        description: Some("SPIROM 注文".to_string()),
        metadata: Some(metadata),
        shipping_address: Some(stripe_shipping_address),
        idempotency_key: Some(idempotency_key),
    };

    let payment_intent = payment_provider.create_intent(params).await.map_err(|e| {
        tracing::error!("PaymentIntent作成エラー: {}", e);
        AppError::Internal("決済の初期化に失敗しました。しばらくしてから再試行してください。".to_string())
    })?;

    Ok(Json(DataResponse::new(CreatePaymentIntentResponse {
        client_secret: payment_intent.client_secret,
        payment_intent_id: payment_intent.id.clone(),
        order_id: Uuid::nil(), // 注文はまだ作成されていない
    })))
}

/// ゲスト用PaymentIntent作成リクエスト（注文は作成せず、Webhookで作成）
#[derive(Debug, Deserialize, Validate)]
pub struct CreateGuestPaymentIntentRequest {
    /// ゲストのメールアドレス
    #[validate(email)]
    pub email: String,
    /// 配送先住所
    pub shipping_address: GuestShippingAddress,
    /// 請求先住所（指定しない場合は配送先と同じ）
    pub billing_address: Option<GuestShippingAddress>,
    /// 決済方法
    pub payment_method: PaymentMethod,
    /// 注文アイテム
    #[validate(length(min = 1))]
    pub items: Vec<PaymentMetadataItem>,
    /// 備考
    #[validate(length(max = 500))]
    pub notes: Option<String>,
}

/// ゲスト用PaymentIntent作成（認証不要、注文はWebhookで作成）
pub async fn create_payment_intent_guest(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateGuestPaymentIntentRequest>,
) -> Result<Json<DataResponse<CreatePaymentIntentResponse>>> {
    req.validate()?;

    let session_id = headers
        .get("X-Session-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(generate_session_id);

    tracing::info!(
        "create_payment_intent_guest: session_id={}, email={}",
        &session_id[..session_id.len().min(15)],
        &req.email
    );

    let db_service = state.db.service();
    let product_repo = ProductRepository::new(db_service);

    // 商品情報取得・金額計算
    let product_ids: Vec<_> = req.items.iter().map(|i| i.product_id).collect();
    let products = product_repo.find_by_ids(&product_ids).await?;

    let mut items_for_metadata: Vec<PaymentMetadataItem> = Vec::new();
    let mut subtotal = 0i64;

    for item in &req.items {
        let product = products
            .get(&item.product_id)
            .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

        if !product.is_active {
            return Err(AppError::BadRequest(format!(
                "「{}」は現在販売されていません",
                product.name
            )));
        }

        // 在庫確認（予約はWebhookで行う）
        if product.stock < item.quantity {
            return Err(AppError::BadRequest(format!(
                "「{}」の在庫が不足しています",
                product.name
            )));
        }

        let item_price = product.price;
        subtotal += item_price * item.quantity as i64;

        items_for_metadata.push(PaymentMetadataItem {
            product_id: item.product_id,
            quantity: item.quantity,
            variant_id: item.variant_id,
            size: item.size.clone(),
        });
    }

    // 金額計算
    let shipping_fee = calculate_shipping_fee(subtotal, &req.shipping_address.country);
    let tax = calculate_tax(subtotal);
    let total = subtotal + shipping_fee + tax;

    // Stripe PaymentIntent作成
    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();
    let webhook_secrets = std::env::var("STRIPE_WEBHOOK_SECRETS").ok();

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret, webhook_secrets);

    // metadataに注文作成に必要な情報を含める（認証ユーザーと同じ形式）
    let mut metadata = std::collections::HashMap::new();
    metadata.insert("is_guest_order".to_string(), "true".to_string());
    metadata.insert("guest_email".to_string(), req.email.clone());
    metadata.insert("guest_name".to_string(), req.shipping_address.name.clone());
    metadata.insert("guest_phone".to_string(), req.shipping_address.phone.clone());
    metadata.insert("payment_method".to_string(), format!("{}", req.payment_method));
    if let Some(ref notes) = req.notes {
        metadata.insert("notes".to_string(), notes.clone());
    }
    // カート情報をJSONで保存
    let items_json = serde_json::to_string(&items_for_metadata)
        .map_err(|_| AppError::Internal("カート情報のシリアライズに失敗しました".to_string()))?;
    metadata.insert("items".to_string(), items_json);
    // 金額情報
    metadata.insert("subtotal".to_string(), subtotal.to_string());
    metadata.insert("shipping_fee".to_string(), shipping_fee.to_string());
    metadata.insert("tax".to_string(), tax.to_string());
    // 配送先情報
    let shipping_addr_json = serde_json::json!({
        "name": req.shipping_address.name,
        "country": req.shipping_address.country,
        "postal_code": req.shipping_address.postal_code,
        "prefecture": req.shipping_address.prefecture,
        "city": req.shipping_address.city,
        "address_line1": req.shipping_address.address_line1,
        "address_line2": req.shipping_address.address_line2,
        "phone": req.shipping_address.phone,
    });
    metadata.insert("shipping_address".to_string(), shipping_addr_json.to_string());
    // 請求先情報
    if let Some(ref billing) = req.billing_address {
        let billing_addr_json = serde_json::json!({
            "name": billing.name,
            "country": billing.country,
            "postal_code": billing.postal_code,
            "prefecture": billing.prefecture,
            "city": billing.city,
            "address_line1": billing.address_line1,
            "address_line2": billing.address_line2,
            "phone": billing.phone,
        });
        metadata.insert("billing_address".to_string(), billing_addr_json.to_string());
    }

    // Stripe用の配送先住所情報を作成
    let stripe_shipping_address = ShippingAddress {
        name: req.shipping_address.name.clone(),
        postal_code: req.shipping_address.postal_code.clone(),
        prefecture: req.shipping_address.prefecture.clone(),
        city: req.shipping_address.city.clone(),
        address_line1: req.shipping_address.address_line1.clone(),
        address_line2: req.shipping_address.address_line2.clone(),
        phone: Some(req.shipping_address.phone.clone()),
    };

    // 冪等性キー
    let idempotency_key = format!("pi_guest_{}", Uuid::new_v4());

    let params = CreateIntentParams {
        order_id: Uuid::new_v4(), // 仮のID（実際の注文はWebhookで作成）
        amount: total,
        currency: "JPY".to_string(),
        customer_email: req.email.clone(),
        customer_name: Some(req.shipping_address.name.clone()),
        description: Some("SPIROM ゲスト注文".to_string()),
        metadata: Some(metadata),
        shipping_address: Some(stripe_shipping_address),
        idempotency_key: Some(idempotency_key),
    };

    let payment_intent = payment_provider.create_intent(params).await.map_err(|e| {
        tracing::error!("PaymentIntent作成エラー: {}", e);
        AppError::Internal("決済の初期化に失敗しました。しばらくしてから再試行してください。".to_string())
    })?;

    Ok(Json(DataResponse::new(CreatePaymentIntentResponse {
        client_secret: payment_intent.client_secret,
        payment_intent_id: payment_intent.id.clone(),
        order_id: Uuid::nil(), // 注文はまだ作成されていない
    })))
}

/// 既存ゲスト注文用PaymentIntent作成リクエスト
#[derive(Debug, Deserialize, Validate)]
pub struct CreatePaymentIntentForGuestOrderRequest {
    /// 注文ID
    pub order_id: Uuid,
    /// ゲストアクセストークン
    pub guest_token: String,
}

/// 既存ゲスト注文用PaymentIntent作成（注文作成済みの場合）
pub async fn create_payment_intent_for_guest_order(
    State(state): State<AppState>,
    Json(req): Json<CreatePaymentIntentForGuestOrderRequest>,
) -> Result<Json<DataResponse<CreatePaymentIntentResponse>>> {
    req.validate()?;

    use crate::models::hash_guest_token;

    // ゲストトークンを検証して注文を取得
    let token_hash = hash_guest_token(&req.guest_token);
    let order_repo = OrderRepository::new(state.db.anonymous());
    let order = order_repo
        .find_by_guest_token_rpc(&token_hash, req.order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

    // 注文が決済可能な状態であることを確認
    // - PendingPayment: 新フロー（正しい状態）
    // - Processing + payment_status=Pending: 旧フローとの互換性
    let can_pay = order.status == OrderStatus::PendingPayment
        || (order.status == OrderStatus::Processing && order.payment_status == PaymentStatus::Pending);

    if !can_pay {
        return Err(AppError::BadRequest("この注文は既に決済済みか、キャンセルされています".to_string()));
    }

    // Stripe PaymentIntent作成
    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();
    let webhook_secrets = std::env::var("STRIPE_WEBHOOK_SECRETS").ok();

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret, webhook_secrets);

    // metadataに注文情報を含める
    let mut metadata = std::collections::HashMap::new();
    metadata.insert("order_id".to_string(), order.id.to_string());
    metadata.insert("is_guest".to_string(), "true".to_string());

    // 配送先住所情報をmetadataに保存
    let shipping_addr_json = serde_json::json!({
        "name": order.shipping_address.name,
        "country": order.shipping_address.country,
        "postal_code": order.shipping_address.postal_code,
        "prefecture": order.shipping_address.prefecture,
        "city": order.shipping_address.city,
        "address_line1": order.shipping_address.address_line1,
        "address_line2": order.shipping_address.address_line2,
        "phone": order.shipping_address.phone,
    });
    metadata.insert("shipping_address".to_string(), shipping_addr_json.to_string());

    // 注文アイテム情報をmetadataに保存
    let items_for_metadata: Vec<PaymentMetadataItem> = order.items.iter().map(|item| {
        PaymentMetadataItem {
            product_id: item.product_id,
            quantity: item.quantity,
            variant_id: item.variant_id,
            size: item.size.clone(),
        }
    }).collect();
    let items_json = serde_json::to_string(&items_for_metadata)
        .map_err(|_| AppError::Internal("アイテムのシリアライズに失敗".to_string()))?;
    metadata.insert("items".to_string(), items_json);

    // 金額情報
    metadata.insert("subtotal".to_string(), order.subtotal.to_string());
    metadata.insert("shipping_fee".to_string(), order.shipping_fee.to_string());
    metadata.insert("tax".to_string(), order.tax.to_string());
    metadata.insert("payment_method".to_string(), format!("{:?}", order.payment_method));

    // ゲスト情報
    if let Some(ref email) = order.guest_email {
        metadata.insert("guest_email".to_string(), email.clone());
    }
    if let Some(ref phone) = order.guest_phone {
        metadata.insert("guest_phone".to_string(), phone.clone());
    }

    // Stripe用の配送先住所情報
    let stripe_shipping_address = ShippingAddress {
        name: order.shipping_address.name.clone(),
        postal_code: order.shipping_address.postal_code.clone(),
        prefecture: order.shipping_address.prefecture.clone(),
        city: order.shipping_address.city.clone(),
        address_line1: order.shipping_address.address_line1.clone(),
        address_line2: order.shipping_address.address_line2.clone(),
        phone: order.shipping_address.phone.clone(),
    };

    // 冪等性キー（同じ注文に対して同じキーを使用）
    let idempotency_key = format!("pi_guest_order_{}", order.id);

    let params = CreateIntentParams {
        order_id: order.id,
        amount: order.total,
        currency: "JPY".to_string(),
        customer_email: order.guest_email.clone().unwrap_or_default(),
        customer_name: Some(order.shipping_address.name.clone()),
        description: Some(format!("SPIROM ゲスト注文 #{}", order.order_number)),
        metadata: Some(metadata),
        shipping_address: Some(stripe_shipping_address),
        idempotency_key: Some(idempotency_key),
    };

    let payment_intent = payment_provider.create_intent(params).await.map_err(|e| {
        tracing::error!("PaymentIntent作成エラー: {}", e);
        AppError::Internal("決済の初期化に失敗しました。しばらくしてから再試行してください。".to_string())
    })?;

    Ok(Json(DataResponse::new(CreatePaymentIntentResponse {
        client_secret: payment_intent.client_secret,
        payment_intent_id: payment_intent.id.clone(),
        order_id: order.id,
    })))
}

/// Webhook受信
pub async fn handle_webhook(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> Result<StatusCode> {
    tracing::info!("Webhook handler started, body_len={}", body.len());

    // Stripe署名を取得
    let signature = headers
        .get("stripe-signature")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| AppError::BadRequest("署名がありません".to_string()))?;

    tracing::info!("Webhook received: body_len={}, signature_len={}", body.len(), signature.len());
    tracing::debug!("Webhook signature: {}", &signature[..signature.len().min(50)]);

    // Stripe PaymentProvider初期化
    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();
    let webhook_secrets = std::env::var("STRIPE_WEBHOOK_SECRETS").ok();

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret, webhook_secrets);

    // Webhook検証
    let event = payment_provider
        .verify_webhook(&body, signature)
        .map_err(|e| {
            tracing::error!("Webhook verification failed: {}", e);
            AppError::BadRequest(format!("Webhook検証に失敗しました: {}", e))
        })?;

    // イベントタイプをログ出力（全イベントで必ず出力）
    let raw_event_type = event.data["type"].as_str().unwrap_or("unknown");

    tracing::info!(
        "=== WEBHOOK EVENT === event_id={}, raw_type={}, parsed_type={:?}",
        event.event_id,
        raw_event_type,
        event.event_type
    );

    // Webhook処理用のクライアント
    // - record_stripe_event RPC は service_role のみ許可されている
    // - 注文作成も service_role で行う（RLSバイパス必要）
    let db_service = state.db.service();
    let order_repo = OrderRepository::new(db_service.clone());
    let product_repo = ProductRepository::new(db_service.clone());

    // ---- 冪等性: Stripe Event ID を保存して多重実行を防ぐ ----
    let payload_summary = stripe_event_summary(&event);

    // PaymentSucceeded時は、まだ注文が存在しないためorder_idをnullにする
    // （ゲストも認証ユーザーもWebhookで注文作成するフローに統一）
    let order_id_for_event = match event.event_type {
        WebhookEventType::PaymentSucceeded => None,
        _ => event.order_id,
    };

    let recorded_result = db_service
        .rpc(
            "record_stripe_event",
            &serde_json::json!({
                "p_event_id": event.event_id.clone(),
                "p_event_type": format!("{:?}", event.event_type),
                "p_payment_intent_id": event.payment_id.clone(),
                "p_order_id": order_id_for_event,
                "p_payload": payload_summary,
            }),
        )
        .await;

    tracing::debug!("record_stripe_event RPC result: {:?}", recorded_result);
    match recorded_result {
        Ok(false) => {
            // 既に処理済みのイベント
            tracing::info!("Webhook event already processed (skipping): {}", event.event_id);
            return Ok(StatusCode::OK);
        }
        Ok(true) => {
            // 新規イベント、処理を続行
            tracing::info!("Processing new webhook event: {}, type={:?}", event.event_id, event.event_type);
        }
        Err(e) => {
            // RPC失敗時は処理を停止（二重処理を防ぐため安全側に倒す）
            tracing::error!(
                "Failed to record stripe event (stopping to prevent duplicate processing): event_id={}, error={}",
                event.event_id,
                e
            );
            return Err(AppError::Internal(
                "Webhook冪等性チェックに失敗しました。再試行してください。".to_string()
            ));
        }
    }

    // イベント処理
    match event.event_type {
        WebhookEventType::PaymentSucceeded => {
            let metadata = &event.data["data"]["object"]["metadata"];
            let stripe_amount = event.data["data"]["object"]["amount"].as_i64().unwrap_or(0);

            tracing::info!(
                "PaymentSucceeded処理開始: payment_id={}, stripe_amount={}, metadata={:?}",
                event.payment_id,
                stripe_amount,
                metadata
            );

            let is_guest = metadata["is_guest_order"].as_str() == Some("true");

            // ゲストも認証ユーザーも同じフロー：metadataから注文を作成
            {
                // === 二重処理防止チェック ===
                let service_order_repo = OrderRepository::new(state.db.service());
                if service_order_repo.exists_by_payment_id(&event.payment_id).await? {
                    tracing::info!(
                        "注文は既に作成済み: payment_id={}, スキップ",
                        event.payment_id
                    );
                    return Ok(StatusCode::OK);
                }

                let items_json = metadata["items"].as_str()
                    .ok_or_else(|| AppError::BadRequest("itemsがmetadataにありません".to_string()))?;
                let items: Vec<PaymentMetadataItem> = serde_json::from_str(items_json)
                    .map_err(|_| AppError::BadRequest("itemsのパースに失敗しました".to_string()))?;

                // 配送先住所を先に取得（国コードが金額計算に必要）
                let shipping_address_json = metadata["shipping_address"].as_str()
                    .ok_or_else(|| AppError::BadRequest("shipping_addressが不正です".to_string()))?;
                let shipping_address: OrderAddress = serde_json::from_str(shipping_address_json)
                    .map_err(|_| AppError::BadRequest("shipping_addressのパースに失敗しました".to_string()))?;

                // === 金額改ざん防止: サーバー側で再計算 ===
                // 商品情報をDBから取得して金額を再計算
                let product_ids: Vec<Uuid> = items.iter().map(|i| i.product_id).collect();
                let products = product_repo.find_by_ids(&product_ids).await?;

                let mut recalculated_subtotal: i64 = 0;
                for item in &items {
                    let product = products
                        .get(&item.product_id)
                        .ok_or_else(|| AppError::BadRequest("商品が見つかりません".to_string()))?;
                    recalculated_subtotal += product.price * item.quantity as i64;
                }

                // サーバー側で送料・税を再計算
                let recalculated_shipping = calculate_shipping_fee(recalculated_subtotal, &shipping_address.country);
                let recalculated_tax = calculate_tax(recalculated_subtotal);
                let recalculated_total = recalculated_subtotal + recalculated_shipping + recalculated_tax;

                // Stripe金額と再計算金額を比較
                if stripe_amount != recalculated_total {
                    tracing::error!(
                        "!!! 返金トリガー: 金額改ざん検出 !!! stripe_amount={}, recalculated_total={}, subtotal={}, shipping={}, tax={}",
                        stripe_amount, recalculated_total, recalculated_subtotal, recalculated_shipping, recalculated_tax
                    );
                    let refund_provider = payment_provider.clone();
                    let payment_id = event.payment_id.clone();
                    tokio::spawn(async move {
                        let _ = refund_provider.refund(&payment_id, None).await;
                    });
                    return Ok(StatusCode::OK);
                }

                // 検証済みの金額を使用
                let subtotal = recalculated_subtotal;
                let shipping_fee = recalculated_shipping;
                let tax = recalculated_tax;
                let total = recalculated_total;

                // ユーザー情報（ゲストの場合はNone）
                let user_id: Option<Uuid> = if is_guest {
                    None
                } else {
                    let user_id_str = metadata["user_id"].as_str()
                        .ok_or_else(|| AppError::BadRequest("user_idがmetadataにありません".to_string()))?;
                    Some(user_id_str.parse()
                        .map_err(|_| AppError::BadRequest("user_idが不正です".to_string()))?)
                };

                // ゲスト情報
                let guest_email = if is_guest {
                    metadata["guest_email"].as_str().map(|s| s.to_string())
                } else { None };
                let guest_name = if is_guest {
                    metadata["guest_name"].as_str().map(|s| s.to_string())
                } else { None };
                let guest_phone = if is_guest {
                    metadata["guest_phone"].as_str().map(|s| s.to_string())
                } else { None };
                // ゲスト用アクセストークン生成
                let (guest_access_token_hash, guest_token_expires_at) = if is_guest {
                    let (_token, hash) = generate_guest_access_token();
                    (Some(hash), Some(guest_token_expiry()))
                } else {
                    (None, None)
                };

                let billing_address: Option<OrderAddress> = metadata["billing_address"]
                    .as_str()
                    .and_then(|s| serde_json::from_str(s).ok());

                let payment_method_str = metadata["payment_method"].as_str().unwrap_or("credit_card");
                let payment_method = match payment_method_str {
                    "credit_card" | "CreditCard" => PaymentMethod::CreditCard,
                    "paypay" | "PayPay" => PaymentMethod::PayPay,
                    "rakuten_pay" | "RakutenPay" => PaymentMethod::RakutenPay,
                    "konbini" | "Konbini" => PaymentMethod::Konbini,
                    "bank_transfer" | "BankTransfer" => PaymentMethod::BankTransfer,
                    _ => PaymentMethod::CreditCard,
                };

                let notes = metadata["notes"].as_str().map(|s| s.to_string());

                tracing::info!(
                    "注文作成準備: is_guest={}, stripe_amount={}, subtotal={}, shipping_fee={}, tax={}, total={}",
                    is_guest, stripe_amount, subtotal, shipping_fee, tax, total
                );

                // 注文アイテム作成（productsは既に取得済み）
                let mut order_items = Vec::new();
                let mut stock_reserve_items: Vec<(Uuid, i32)> = Vec::new();

                for item in &items {
                    let product = products
                        .get(&item.product_id)
                        .ok_or_else(|| AppError::BadRequest("商品が見つかりません".to_string()))?;

                    order_items.push(OrderItem {
                        product_id: product.id,
                        product_name: product.name.clone(),
                        product_sku: product.sku.clone(),
                        price: product.price,
                        quantity: item.quantity,
                        subtotal: product.price * item.quantity as i64,
                        image_url: product.images.first().cloned(),
                        variant_id: item.variant_id,
                        size: item.size.clone(),
                    });

                    stock_reserve_items.push((product.id, item.quantity));
                }

                // 在庫確保
                tracing::info!("在庫確保開始: items={:?}", stock_reserve_items);
                let reserved = product_repo.reserve_stock_bulk(&stock_reserve_items).await?;
                tracing::info!("在庫確保結果: reserved={}", reserved);
                if !reserved {
                    tracing::error!("!!! 返金トリガー: 在庫確保失敗 !!! payment_id={}, items={:?}", event.payment_id, stock_reserve_items);
                    let refund_provider = payment_provider.clone();
                    let payment_id = event.payment_id.clone();
                    tokio::spawn(async move {
                        let _ = refund_provider.refund(&payment_id, None).await;
                    });
                    return Ok(StatusCode::OK);
                }

                let now = chrono::Utc::now();
                let order = Order {
                    id: Uuid::new_v4(),
                    user_id,
                    order_number: generate_order_number(),
                    status: OrderStatus::Paid,
                    items: order_items,
                    subtotal,
                    shipping_fee,
                    tax,
                    total,
                    currency: "JPY".to_string(),
                    shipping_address,
                    billing_address,
                    payment_method,
                    payment_status: PaymentStatus::Paid,
                    payment_id: Some(event.payment_id.clone()),
                    notes,
                    created_at: now,
                    updated_at: now,
                    shipped_at: None,
                    delivered_at: None,
                    is_guest_order: is_guest,
                    guest_email,
                    guest_name,
                    guest_phone,
                    guest_access_token_hash,
                    guest_token_expires_at,
                    // 暗号資産決済用（初期状態はNone - Stripe決済なので使用しない）
                    crypto_tx_hash: None,
                    crypto_chain_id: None,
                    crypto_sender_address: None,
                    crypto_confirmed_at: None,
                };

                // service_roleで注文作成
                tracing::info!("注文作成開始: order_id={}, is_guest={}, user_id={:?}", order.id, is_guest, user_id);
                let service_order_repo = OrderRepository::new(state.db.service());
                if let Err(e) = service_order_repo.create(&order).await {
                    tracing::error!("!!! 返金トリガー: 注文作成失敗 !!! error={}, payment_id={}, order_id={}", e, event.payment_id, order.id);
                    let _ = product_repo.release_stock_bulk(&stock_reserve_items).await;
                    let refund_provider = payment_provider.clone();
                    let payment_id = event.payment_id.clone();
                    tokio::spawn(async move {
                        let _ = refund_provider.refund(&payment_id, None).await;
                    });
                    return Ok(StatusCode::OK);
                }

                tracing::info!("注文作成成功: order_id={}, payment_id={}, is_guest={}", order.id, event.payment_id, is_guest);
            }
        }
        WebhookEventType::PaymentFailed => {
            // ゲストも認証ユーザーも注文は未作成なので何もしない
            // （在庫確保も支払い成功時に行うため、解放する在庫もない）
            tracing::warn!("決済失敗: payment_id={} (注文未作成のため処理不要)", event.payment_id);
        }
        WebhookEventType::RefundSucceeded => {
            if let Some(order_id) = event.order_id {
                // 返金完了状態に更新（RPC関数）
                order_repo
                    .update_order_from_webhook_rpc(order_id, None, Some("refunded"), Some("\"refunded\""))
                    .await?;

                tracing::info!(
                    "注文 {} の返金が完了しました: payment_id={}",
                    order_id,
                    event.payment_id
                );
            }
        }
        _ => {
            tracing::debug!("未処理のWebhookイベント: {:?}", event.event_type);
        }
    }

    Ok(StatusCode::OK)
}

/// 決済確認（テスト用）
#[derive(Debug, Deserialize, Validate)]
pub struct ConfirmPaymentRequest {
    pub payment_intent_id: String,
}

/// 決済確認
/// セキュリティ: テスト用エンドポイント - 厳格な環境チェックを適用
pub async fn confirm_payment(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthenticatedUser>,
    Json(req): Json<ConfirmPaymentRequest>,
) -> Result<Json<DataResponse<()>>> {
    req.validate()?;

    // セキュリティ: テスト用エンドポイントは開発環境のみ許可
    // 明示的に "development" または "local" が設定されている場合のみ許可
    // その他の値（空文字、"staging"、"production" 等）はすべて拒否
    let env = std::env::var("ENVIRONMENT").unwrap_or_default();
    let allowed_envs = ["development", "local"];
    if !allowed_envs.contains(&env.as_str()) {
        tracing::warn!(
            "Test endpoint access denied: environment={}, allowed={:?}",
            env,
            allowed_envs
        );
        return Err(AppError::Forbidden("このエンドポイントは開発環境のみ利用可能です".to_string()));
    }

    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();
    let webhook_secrets = std::env::var("STRIPE_WEBHOOK_SECRETS").ok();

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret, webhook_secrets);

    // 決済確認
    let result = payment_provider
        .confirm(&req.payment_intent_id)
        .await
        .map_err(|e| AppError::Internal(format!("決済確認に失敗しました: {}", e)))?;

    tracing::info!(
        "決済確認: payment_id={}, status={:?}",
        result.id,
        result.status
    );

    Ok(Json(DataResponse::new(())))
}

/// 返金リクエスト
#[derive(Debug, Deserialize, Validate)]
pub struct CreateRefundRequest {
    pub order_id: Uuid,
    #[validate(range(min = 1))]
    pub amount: Option<i64>,
}

/// 返金作成
pub async fn create_refund(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    Json(req): Json<CreateRefundRequest>,
) -> Result<Json<DataResponse<()>>> {
    req.validate()?;

    // 返金は管理者のみ許可（不正返金対策）
    if auth_user.role != UserRole::Admin {
        return Err(AppError::Forbidden("返金には管理者権限が必要です".to_string()));
    }

    // 管理者JWTでアクセス（RLSポリシー is_admin() で許可）
    let order_repo = OrderRepository::new(state.db.with_auth(&token));

    // 注文取得
    let order = order_repo
        .find_by_id(req.order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

    // 管理者は全ての注文を返金可能（user_idチェック不要）
    tracing::info!(
        "Admin refund initiated: admin_id={}, order_user_id={:?}, order_id={}",
        auth_user.id,
        order.user_id,
        order.id
    );

    // 決済済みかチェック
    if order.payment_status != PaymentStatus::Paid {
        return Err(AppError::BadRequest("この注文は返金できません".to_string()));
    }

    let payment_id = order
        .payment_id
        .ok_or_else(|| AppError::BadRequest("決済IDが見つかりません".to_string()))?;

    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();
    let webhook_secrets = std::env::var("STRIPE_WEBHOOK_SECRETS").ok();

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret, webhook_secrets);

    // 返金実行
    let refund = payment_provider
        .refund(&payment_id, req.amount)
        .await
        .map_err(|e| AppError::Internal(format!("返金に失敗しました: {}", e)))?;

    tracing::info!(
        "返金作成: order_id={}, refund_id={}, amount={}",
        order.id,
        refund.id,
        refund.amount
    );

    // 返金処理中状態に更新
    order_repo
        .update_payment_status(order.id, PaymentStatus::Refunding)
        .await?;

    Ok(Json(DataResponse::new(())))
}

