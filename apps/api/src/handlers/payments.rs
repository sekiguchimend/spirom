use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::{OrderRepository, ProductRepository, UserRepository};
use crate::error::{AppError, Result};
use crate::models::{
    AuthenticatedUser, DataResponse, Order, OrderAddress, OrderItem, OrderStatus, PaymentMethod,
    PaymentStatus, generate_order_number,
};
use crate::services::payment::{
    CreateIntentParams, PaymentProvider, ShippingAddress, StripePaymentProvider, WebhookEventType,
};

/// PaymentIntent作成リクエスト
#[derive(Debug, Deserialize, Validate)]
pub struct CreatePaymentIntentRequest {
    #[validate(length(min = 1, message = "商品が選択されていません"))]
    pub items: Vec<PaymentIntentItem>,
    pub shipping_address_id: Uuid,
    #[validate(length(max = 500))]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct PaymentIntentItem {
    pub product_id: Uuid,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub product_name: Option<String>,
    #[validate(range(min = 1, message = "数量は1以上である必要があります"))]
    pub quantity: i32,
    #[validate(range(min = 1, message = "価格は1以上である必要があります"))]
    pub price: i64,
}

/// PaymentIntent作成レスポンス
#[derive(Debug, Serialize)]
pub struct CreatePaymentIntentResponse {
    pub client_secret: String,
    pub payment_intent_id: String,
}

/// PaymentIntent作成（注文は作成しない。決済成功後にWebhookで作成する）
pub async fn create_payment_intent(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Json(req): Json<CreatePaymentIntentRequest>,
) -> Result<Json<DataResponse<CreatePaymentIntentResponse>>> {
    // 手動でitemsの各要素を検証
    for item in &req.items {
        item.validate()?;
    }
    req.validate()?;

    let product_repo = crate::db::repositories::ProductRepository::new(state.db.service());
    
    // 商品情報を取得して金額を計算
    let mut total: i64 = 0;
    let mut items_with_names = Vec::new();
    
    for item in &req.items {
        let product = product_repo
            .find_by_id(item.product_id)
            .await
            .map_err(|e| {
                tracing::error!("商品取得エラー: product_id={}, error={}", item.product_id, e);
                AppError::Internal(format!("商品情報の取得に失敗しました: {}", e))
            })?
            .ok_or_else(|| {
                tracing::warn!("商品が見つかりません: product_id={}", item.product_id);
                AppError::NotFound(format!("商品ID {} が見つかりません", item.product_id))
            })?;
        
        // 価格検証
        if product.price != item.price {
            return Err(AppError::BadRequest(format!(
                "商品「{}」の価格が一致しません",
                product.name
            )));
        }
        
        // 在庫チェック
        if product.stock < item.quantity {
            return Err(AppError::BadRequest(format!(
                "「{}」の在庫が不足しています",
                product.name
            )));
        }
        
        let item_total = product.price * item.quantity as i64;
        total += item_total;
        
        items_with_names.push(PaymentIntentItem {
            product_id: item.product_id,
            product_name: Some(product.name),
            quantity: item.quantity,
            price: item.price,
        });
    }
    
    // 送料計算（5000円以上で無料）
    let shipping_fee = if total >= 5000 { 0 } else { 550 };
    total += shipping_fee;
    
    // 税計算（10%）
    let tax = (total as f64 * 0.1) as i64;
    total += tax;

    // 住所情報を取得
    let user_repo = UserRepository::new(state.db.service());
    let shipping_address = user_repo
        .find_address(auth_user.id, req.shipping_address_id)
        .await?
        .ok_or_else(|| AppError::NotFound("配送先住所が見つかりません".to_string()))?;

    // ユーザー情報を取得（名前を取得するため）
    let user = user_repo
        .find_by_id(auth_user.id)
        .await?
        .ok_or_else(|| AppError::NotFound("ユーザーが見つかりません".to_string()))?;

    // Stripe PaymentIntent作成
    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET")
        .map_err(|_| AppError::Internal("Webhook秘密鍵が設定されていません".to_string()))?;

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret);

    // metadataに注文情報を含める（決済成功後にWebhookで注文を作成）
    let mut metadata = std::collections::HashMap::new();
    metadata.insert("user_id".to_string(), auth_user.id.to_string());
    metadata.insert("shipping_address_id".to_string(), req.shipping_address_id.to_string());
    metadata.insert("items".to_string(), serde_json::to_string(&items_with_names)
        .map_err(|e| AppError::Internal(format!("商品情報のシリアライズに失敗しました: {}", e)))?);
    metadata.insert("shipping_fee".to_string(), shipping_fee.to_string());
    metadata.insert("tax".to_string(), tax.to_string());
    if let Some(notes) = &req.notes {
        metadata.insert("notes".to_string(), notes.clone());
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

    let params = CreateIntentParams {
        order_id: Uuid::new_v4(), // 一時的なID（注文はまだ作成しない）
        amount: total,
        currency: "JPY".to_string(),
        customer_email: auth_user.email.clone(),
        customer_name: Some(user.name.clone()),
        description: Some(format!("SPIROM 商品購入（{}点）", req.items.len())),
        metadata: Some(metadata),
        shipping_address: Some(stripe_shipping_address),
    };

    let payment_intent = payment_provider.create_intent(params).await.map_err(|e| {
        tracing::error!("PaymentIntent作成エラー: {}", e);
        AppError::Internal(format!("PaymentIntent作成に失敗しました: {}", e))
    })?;

    Ok(Json(DataResponse::new(CreatePaymentIntentResponse {
        client_secret: payment_intent.client_secret,
        payment_intent_id: payment_intent.id,
    })))
}

/// Webhook受信
pub async fn handle_webhook(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> Result<StatusCode> {
    // Stripe署名を取得
    let signature = headers
        .get("stripe-signature")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| AppError::BadRequest("署名がありません".to_string()))?;

    // Stripe PaymentProvider初期化
    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET")
        .map_err(|_| AppError::Internal("Webhook秘密鍵が設定されていません".to_string()))?;

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret);

    // Webhook検証
    let event = payment_provider
        .verify_webhook(&body, signature)
        .map_err(|e| AppError::BadRequest(format!("Webhook検証に失敗しました: {}", e)))?;

    // WebhookはStripeからのリクエストなので、service_roleを使用
    let order_repo = OrderRepository::new(state.db.service());
    let product_repo = ProductRepository::new(state.db.service());
    let user_repo = UserRepository::new(state.db.service());

    // イベント処理
    match event.event_type {
        WebhookEventType::PaymentSucceeded => {
            let order_id = event
                .order_id
                .ok_or_else(|| AppError::BadRequest("注文IDが見つかりません".to_string()))?;

            // idempotency: 既に注文が作成済みならOK（Stripeは同一イベントを再送する）
            if let Some(existing) = order_repo.find_by_id(order_id).await? {
                tracing::info!(
                    "決済成功Webhook: 既存注文を検出。order_id={}, payment_id={}",
                    existing.id,
                    event.payment_id
                );
                order_repo.update_payment_id(order_id, existing.user_id, &event.payment_id).await?;
                order_repo.update_payment_status(order_id, PaymentStatus::Paid).await?;
                order_repo
                    .update_status(order_id, existing.user_id, OrderStatus::Paid, existing.created_at.timestamp_millis())
                    .await?;
                return Ok(StatusCode::OK);
            }

            let metadata = &event.data["data"]["object"]["metadata"];
            let user_id = metadata["user_id"]
                .as_str()
                .and_then(|s| s.parse::<Uuid>().ok())
                .ok_or_else(|| AppError::BadRequest("user_id が不正です".to_string()))?;
            let shipping_address_id = metadata["shipping_address_id"]
                .as_str()
                .and_then(|s| s.parse::<Uuid>().ok())
                .ok_or_else(|| AppError::BadRequest("shipping_address_id が不正です".to_string()))?;

            let items_json = metadata["items"]
                .as_str()
                .ok_or_else(|| AppError::BadRequest("items が不正です".to_string()))?;
            let items: Vec<PaymentIntentItem> = serde_json::from_str(items_json)
                .map_err(|_| AppError::BadRequest("items が不正です".to_string()))?;

            let shipping_fee = metadata["shipping_fee"]
                .as_str()
                .and_then(|s| s.parse::<i64>().ok())
                .unwrap_or(0);
            let tax = metadata["tax"]
                .as_str()
                .and_then(|s| s.parse::<i64>().ok())
                .unwrap_or(0);
            let notes = metadata["notes"].as_str().map(|s| s.to_string());

            // ユーザー/住所を取得（埋め込み用）
            let user = user_repo
                .find_by_id(user_id)
                .await?
                .ok_or_else(|| AppError::NotFound("ユーザーが見つかりません".to_string()))?;
            let shipping_address = user_repo
                .find_address(user_id, shipping_address_id)
                .await?
                .ok_or_else(|| AppError::NotFound("配送先住所が見つかりません".to_string()))?;

            // 商品情報を取得して注文アイテム/金額を確定（改ざん検知）
            let product_ids: Vec<_> = items.iter().map(|i| i.product_id).collect();
            let products = product_repo.find_by_ids(&product_ids).await?;

            let mut order_items = Vec::new();
            let mut subtotal = 0i64;

            for item in &items {
                let product = products
                    .get(&item.product_id)
                    .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

                if !product.is_active {
                    return Err(AppError::BadRequest(format!("「{}」は現在販売されていません", product.name)));
                }
                if product.price != item.price {
                    return Err(AppError::BadRequest(format!("商品「{}」の価格が一致しません", product.name)));
                }
                if product.stock < item.quantity {
                    return Err(AppError::BadRequest(format!("「{}」の在庫が不足しています", product.name)));
                }

                let item_subtotal = item.price * item.quantity as i64;
                subtotal += item_subtotal;

                order_items.push(OrderItem {
                    product_id: product.id,
                    product_name: product.name.clone(),
                    product_sku: product.sku.clone(),
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: item_subtotal,
                    image_url: product.images.first().cloned(),
                });
            }

            let total = subtotal + shipping_fee + tax;
            let now = chrono::Utc::now();

            let order = Order {
                id: order_id,
                user_id,
                order_number: generate_order_number(),
                status: OrderStatus::Paid,
                items: order_items,
                subtotal,
                shipping_fee,
                tax,
                total,
                currency: "JPY".to_string(),
                shipping_address: OrderAddress::from_address(&shipping_address, user.name.clone()),
                billing_address: None,
                payment_method: PaymentMethod::CreditCard,
                payment_status: PaymentStatus::Paid,
                payment_id: Some(event.payment_id.clone()),
                notes,
                created_at: now,
                updated_at: now,
                shipped_at: None,
                delivered_at: None,
            };

            // 注文作成（同一order_idで競合した場合は、作成済み扱いで継続）
            if let Err(e) = order_repo.create(&order).await {
                tracing::warn!("注文作成に失敗。再取得して継続します。order_id={}, err={}", order_id, e);
                if order_repo.find_by_id(order_id).await?.is_none() {
                    return Err(e);
                }
            }

            // 在庫を減らす（N+1回避: 取得済み products を利用）
            for item in &order.items {
                let current_stock = products.get(&item.product_id).map(|p| p.stock).unwrap_or(0);
                product_repo
                    .update_stock(item.product_id, current_stock - item.quantity)
                    .await?;
            }

            tracing::info!(
                "決済成功Webhook: 注文作成完了。order_id={}, payment_id={}",
                order_id,
                event.payment_id
            );
        }
        WebhookEventType::PaymentFailed => {
            tracing::warn!("決済失敗: payment_id={}", event.payment_id);
        }
        WebhookEventType::RefundSucceeded => {
            if let Some(order_id) = event.order_id {
                // 返金完了状態に更新
                order_repo
                    .update_payment_status(order_id, PaymentStatus::Refunded)
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
pub async fn confirm_payment(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthenticatedUser>,
    Json(req): Json<ConfirmPaymentRequest>,
) -> Result<Json<DataResponse<()>>> {
    req.validate()?;

    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET")
        .map_err(|_| AppError::Internal("Webhook秘密鍵が設定されていません".to_string()))?;

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret);

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

    let order_repo = OrderRepository::new(state.db.with_auth(&token));

    // 注文取得
    let order = order_repo
        .find_by_id(req.order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

    // 自分の注文かチェック
    if order.user_id != auth_user.id {
        return Err(AppError::Forbidden(
            "この注文にアクセスする権限がありません".to_string(),
        ));
    }

    // 決済済みかチェック
    if order.payment_status != PaymentStatus::Paid {
        return Err(AppError::BadRequest("この注文は返金できません".to_string()));
    }

    let payment_id = order
        .payment_id
        .ok_or_else(|| AppError::BadRequest("決済IDが見つかりません".to_string()))?;

    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET")
        .map_err(|_| AppError::Internal("Webhook秘密鍵が設定されていません".to_string()))?;

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret);

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

