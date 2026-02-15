use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::{OrderRepository, ProductRepository};
use crate::error::{AppError, Result};
use crate::models::{
    AuthenticatedUser, DataResponse, OrderStatus, PaymentStatus, UserRole,
    hash_guest_token,
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

/// PaymentIntent作成リクエスト
#[derive(Debug, Deserialize, Validate)]
pub struct CreatePaymentIntentRequest {
    pub order_id: Uuid,
}

/// PaymentIntent作成レスポンス
#[derive(Debug, Serialize)]
pub struct CreatePaymentIntentResponse {
    pub client_secret: String,
    pub payment_intent_id: String,
    pub order_id: Uuid,
}

/// PaymentIntent作成（必ず既存注文に紐付ける）
pub async fn create_payment_intent(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    Json(req): Json<CreatePaymentIntentRequest>,
) -> Result<Json<DataResponse<CreatePaymentIntentResponse>>> {
    req.validate()?;

    // 注文取得（RLS/認可はJWTで担保しつつ、念のためuser_idも検証）
    let order_repo = OrderRepository::new(state.db.with_auth(&token));
    let order = order_repo
        .find_by_id(req.order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

    if order.user_id != Some(auth_user.id) {
        return Err(AppError::Forbidden("この注文にアクセスする権限がありません".to_string()));
    }

    // 期限切れの「古い決済」を防止（価格変更後の古い決済成立も抑止）
    let max_age_seconds: i64 = std::env::var("PAYMENT_INTENT_MAX_AGE_SECONDS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(1800);
    let age_seconds = (chrono::Utc::now() - order.created_at).num_seconds();
    if age_seconds > max_age_seconds {
        // 期限切れは自動キャンセルして在庫を解放（Webhook到達前提の業務フローを避ける）
        // 在庫操作はRPCベースなのでservice_role（クライアント直叩き防止）
        let product_repo = ProductRepository::new(state.db.service());
        let release_items: Vec<(Uuid, i32)> =
            order.items.iter().map(|i| (i.product_id, i.quantity)).collect();
        let _ = product_repo.release_stock_bulk(&release_items).await;
        // 注文更新はRPC関数を使用（anon + SECURITY DEFINER）
        // ※64-72行目でuser_id検証済みなので、ここまで到達するのは正当なユーザーのみ
        let anon_order_repo = OrderRepository::new(state.db.anonymous());
        let _ = anon_order_repo
            .update_order_from_webhook_rpc(order.id, None, Some("cancelled"), Some("\"failed\""))
            .await;

        return Err(AppError::BadRequest("この注文は有効期限切れです。再度ご注文ください。".to_string()));
    }

    if order.status != OrderStatus::PendingPayment || order.payment_status != PaymentStatus::Pending {
        return Err(AppError::BadRequest("この注文は決済できません".to_string()));
    }

    // Stripe PaymentIntent作成
    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();
    let webhook_secrets = std::env::var("STRIPE_WEBHOOK_SECRETS").ok();

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret, webhook_secrets);

    // metadataに最小限の注文情報のみを含める（itemsや金額内訳はDBの注文を正とする）
    let mut metadata = std::collections::HashMap::new();
    metadata.insert("user_id".to_string(), auth_user.id.to_string());
    metadata.insert("order_id".to_string(), order.id.to_string());

    // Stripe用の配送先住所情報を作成
    let stripe_shipping_address = ShippingAddress {
        name: order.shipping_address.name.clone(),
        postal_code: order.shipping_address.postal_code.clone(),
        prefecture: order.shipping_address.prefecture.clone(),
        city: order.shipping_address.city.clone(),
        address_line1: order.shipping_address.address_line1.clone(),
        address_line2: order.shipping_address.address_line2.clone(),
        phone: order.shipping_address.phone.clone(),
    };

    let params = CreateIntentParams {
        order_id: order.id,
        amount: order.total,
        currency: "JPY".to_string(),
        customer_email: auth_user.email.clone(),
        customer_name: Some(order.shipping_address.name.clone()),
        description: Some(format!("SPIROM 注文 {}", order.order_number)),
        metadata: Some(metadata),
        shipping_address: Some(stripe_shipping_address),
        idempotency_key: Some(format!("pi_order_{}", order.id)),
    };

    let payment_intent = payment_provider.create_intent(params).await.map_err(|e| {
        // セキュリティ: エラー詳細はログのみ、ユーザーには汎用メッセージ
        tracing::error!("PaymentIntent作成エラー: {}", e);
        AppError::Internal("決済の初期化に失敗しました。しばらくしてから再試行してください。".to_string())
    })?;

    // 注文にPaymentIntent IDを紐付け（同一注文の二重生成を防ぐ）
    // RPC関数を使用（anon + SECURITY DEFINER）
    // ※64-72行目でuser_id検証済みなので、ここまで到達するのは正当なユーザーのみ
    let anon_order_repo = OrderRepository::new(state.db.anonymous());
    anon_order_repo.update_order_from_webhook_rpc(order.id, Some(&payment_intent.id), None, None).await?;

    Ok(Json(DataResponse::new(CreatePaymentIntentResponse {
        client_secret: payment_intent.client_secret,
        payment_intent_id: payment_intent.id,
        order_id: order.id,
    })))
}

/// ゲスト用PaymentIntent作成リクエスト
#[derive(Debug, Deserialize, Validate)]
pub struct CreateGuestPaymentIntentRequest {
    pub order_id: Uuid,
    pub guest_token: String,
}

/// ゲスト用PaymentIntent作成（認証不要、トークンで認可）
pub async fn create_payment_intent_guest(
    State(state): State<AppState>,
    Json(req): Json<CreateGuestPaymentIntentRequest>,
) -> Result<Json<DataResponse<CreatePaymentIntentResponse>>> {
    req.validate()?;

    // トークンをハッシュ化してゲスト注文を取得（anon + RPC関数で認可）
    let token_hash = hash_guest_token(&req.guest_token);
    let order_repo = OrderRepository::new(state.db.anonymous());
    let order = order_repo
        .find_by_guest_token_rpc(&token_hash, req.order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

    // ゲスト注文であることを確認
    if !order.is_guest_order {
        return Err(AppError::Forbidden("この注文にアクセスする権限がありません".to_string()));
    }

    // 期限切れチェック
    let max_age_seconds: i64 = std::env::var("PAYMENT_INTENT_MAX_AGE_SECONDS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(1800);
    let age_seconds = (chrono::Utc::now() - order.created_at).num_seconds();
    if age_seconds > max_age_seconds {
        // 期限切れは自動キャンセルして在庫を解放（在庫操作はRPCベースなのでservice_role）
        let product_repo = ProductRepository::new(state.db.service());
        let release_items: Vec<(uuid::Uuid, i32)> =
            order.items.iter().map(|i| (i.product_id, i.quantity)).collect();
        let _ = product_repo.release_stock_bulk(&release_items).await;
        // ステータス更新はRPC関数（トークン検証付き）
        let _ = order_repo
            .update_guest_order_status_rpc(order.id, &token_hash, "cancelled", Some("\"failed\""))
            .await;

        return Err(AppError::BadRequest("この注文は有効期限切れです。再度ご注文ください。".to_string()));
    }

    if order.status != OrderStatus::PendingPayment || order.payment_status != PaymentStatus::Pending {
        return Err(AppError::BadRequest("この注文は決済できません".to_string()));
    }

    // Stripe PaymentIntent作成
    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();
    let webhook_secrets = std::env::var("STRIPE_WEBHOOK_SECRETS").ok();

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret, webhook_secrets);

    // metadataに最小限の注文情報のみを含める
    let mut metadata = std::collections::HashMap::new();
    metadata.insert("order_id".to_string(), order.id.to_string());
    metadata.insert("is_guest_order".to_string(), "true".to_string());

    // Stripe用の配送先住所情報を作成
    let stripe_shipping_address = ShippingAddress {
        name: order.shipping_address.name.clone(),
        postal_code: order.shipping_address.postal_code.clone(),
        prefecture: order.shipping_address.prefecture.clone(),
        city: order.shipping_address.city.clone(),
        address_line1: order.shipping_address.address_line1.clone(),
        address_line2: order.shipping_address.address_line2.clone(),
        phone: order.shipping_address.phone.clone(),
    };

    let params = CreateIntentParams {
        order_id: order.id,
        amount: order.total,
        currency: "JPY".to_string(),
        customer_email: order.guest_email.clone().unwrap_or_default(),
        customer_name: Some(order.shipping_address.name.clone()),
        description: Some(format!("SPIROM 注文 {}", order.order_number)),
        metadata: Some(metadata),
        shipping_address: Some(stripe_shipping_address),
        idempotency_key: Some(format!("pi_order_{}", order.id)),
    };

    let payment_intent = payment_provider.create_intent(params).await.map_err(|e| {
        tracing::error!("PaymentIntent作成エラー: {}", e);
        AppError::Internal("決済の初期化に失敗しました。しばらくしてから再試行してください。".to_string())
    })?;

    // 注文にPaymentIntent IDを紐付け（RPC関数でトークン検証付き）
    order_repo.update_guest_order_payment_id_rpc(order.id, &token_hash, &payment_intent.id).await?;

    Ok(Json(DataResponse::new(CreatePaymentIntentResponse {
        client_secret: payment_intent.client_secret,
        payment_intent_id: payment_intent.id,
        order_id: order.id,
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
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();
    let webhook_secrets = std::env::var("STRIPE_WEBHOOK_SECRETS").ok();

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret, webhook_secrets);

    // Webhook検証
    let event = payment_provider
        .verify_webhook(&body, signature)
        .map_err(|e| AppError::BadRequest(format!("Webhook検証に失敗しました: {}", e)))?;

    // anon key + SECURITY DEFINER関数を使用（service_roleを使わない）
    let db = state.db.anonymous();
    let order_repo = OrderRepository::new(db.clone());
    // 在庫操作はRPCベースなのでservice_role（クライアント直叩き防止）
    let product_repo = ProductRepository::new(state.db.service());

    // ---- 冪等性: Stripe Event ID を保存して多重実行を防ぐ ----
    let payload_summary = stripe_event_summary(&event);
    let recorded_result = db
        .rpc(
            "record_stripe_event",
            &serde_json::json!({
                "p_event_id": event.event_id.clone(),
                "p_event_type": format!("{:?}", event.event_type),
                "p_payment_intent_id": event.payment_id.clone(),
                "p_order_id": event.order_id,
                "p_payload": payload_summary,
            }),
        )
        .await;

    match recorded_result {
        Ok(false) => {
            // 既に処理済みのイベント
            tracing::info!("Webhook event already processed: {}", event.event_id);
            return Ok(StatusCode::OK);
        }
        Ok(true) => {
            // 新規イベント、処理を続行
            tracing::debug!("Processing new webhook event: {}", event.event_id);
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
            let order_id = event
                .order_id
                .ok_or_else(|| AppError::BadRequest("注文IDが見つかりません".to_string()))?;

            let order = order_repo
                .find_by_id_for_webhook(order_id)
                .await?
                .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

            // Stripe側の金額/通貨を再検証（乖離は自動返金&キャンセル）
            let stripe_amount = event.data["data"]["object"]["amount"].as_i64().unwrap_or(0);
            let stripe_currency = event.data["data"]["object"]["currency"]
                .as_str()
                .unwrap_or("jpy")
                .to_uppercase();

            if stripe_amount != order.total || stripe_currency != order.currency.to_uppercase() {
                tracing::error!(
                    "Stripe/DB金額乖離検知: order_id={}, stripe_amount={}, db_total={}, stripe_currency={}, db_currency={}",
                    order_id,
                    stripe_amount,
                    order.total,
                    stripe_currency,
                    order.currency
                );

                // 自動返金（安全側に倒す）
                let refund_provider = payment_provider.clone();
                let payment_id = event.payment_id.clone();
                tokio::spawn(async move {
                    let _ = refund_provider.refund(&payment_id, None).await;
                });

                // 注文キャンセル扱い + 在庫復旧（RPC関数で更新）
                order_repo
                    .update_order_from_webhook_rpc(order_id, Some(&event.payment_id), Some("cancelled"), Some("\"failed\""))
                    .await?;

                // 在庫復旧（原子操作 / best-effort）
                let release_items: Vec<(Uuid, i32)> =
                    order.items.iter().map(|i| (i.product_id, i.quantity)).collect();
                let _ = product_repo.release_stock_bulk(&release_items).await?;

                return Ok(StatusCode::OK);
            }

            // 決済成功（RPC関数で更新）
            order_repo
                .update_order_from_webhook_rpc(order_id, Some(&event.payment_id), Some("paid"), Some("\"paid\""))
                .await?;
        }
        WebhookEventType::PaymentFailed => {
            if let Some(order_id) = event.order_id {
                if let Some(order) = order_repo.find_by_id_for_webhook(order_id).await? {
                    tracing::warn!("決済失敗Webhook: order_id={}, payment_id={}", order_id, event.payment_id);

                    // 注文キャンセル（RPC関数で更新）
                    order_repo
                        .update_order_from_webhook_rpc(order_id, Some(&event.payment_id), Some("cancelled"), Some("\"failed\""))
                        .await?;

                    // 在庫復旧（原子操作 / best-effort）
                    let release_items: Vec<(Uuid, i32)> =
                        order.items.iter().map(|i| (i.product_id, i.quantity)).collect();
                    let _ = product_repo.release_stock_bulk(&release_items).await?;
                }
            } else {
                tracing::warn!("決済失敗: payment_id={} (order_id不明)", event.payment_id);
            }
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
pub async fn confirm_payment(
    State(_state): State<AppState>,
    Extension(_auth_user): Extension<AuthenticatedUser>,
    Json(req): Json<ConfirmPaymentRequest>,
) -> Result<Json<DataResponse<()>>> {
    req.validate()?;

    // テスト用エンドポイントは開発環境のみ許可（本番での誤用防止）
    let env = std::env::var("ENVIRONMENT").unwrap_or_else(|_| "production".to_string());
    let is_dev = env == "development" || env == "local";
    if !is_dev {
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

