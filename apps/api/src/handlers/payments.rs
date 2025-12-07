use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::OrderRepository;
use crate::error::{AppError, Result};
use crate::models::{AuthenticatedUser, DataResponse, OrderStatus, PaymentStatus};
use crate::services::payment::{
    CreateIntentParams, PaymentProvider, StripePaymentProvider, WebhookEventType,
};

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
}

/// PaymentIntent作成
pub async fn create_payment_intent(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Json(req): Json<CreatePaymentIntentRequest>,
) -> Result<Json<DataResponse<CreatePaymentIntentResponse>>> {
    req.validate()?;

    let order_repo = OrderRepository::new(state.db.anonymous());

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

    // 決済待ち状態かチェック
    if order.status != OrderStatus::PendingPayment {
        return Err(AppError::BadRequest(
            "この注文は決済できません".to_string(),
        ));
    }

    // Stripe PaymentIntent作成
    let stripe_key = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| AppError::Internal("Stripe APIキーが設定されていません".to_string()))?;
    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET")
        .map_err(|_| AppError::Internal("Webhook秘密鍵が設定されていません".to_string()))?;

    let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret);

    let params = CreateIntentParams {
        order_id: order.id,
        amount: order.total,
        currency: order.currency.clone(),
        customer_email: auth_user.email.clone(),
        description: Some(format!("注文番号: {}", order.order_number)),
        metadata: None,
    };

    let payment_intent = payment_provider.create_intent(params).await.map_err(|e| {
        AppError::Internal(format!("PaymentIntent作成に失敗しました: {}", e))
    })?;

    // 注文にpayment_idを保存
    order_repo
        .update_payment_id(order.id, auth_user.id, &payment_intent.id)
        .await?;

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

    let order_repo = OrderRepository::new(state.db.anonymous());

    // イベント処理
    match event.event_type {
        WebhookEventType::PaymentSucceeded => {
            if let Some(order_id) = event.order_id {
                // 注文取得
                let order = order_repo.find_by_id(order_id).await?;
                if let Some(order) = order {
                    // 決済完了状態に更新
                    order_repo
                        .update_payment_status(order_id, PaymentStatus::Paid)
                        .await?;

                    // 注文ステータスを更新
                    order_repo
                        .update_status(
                            order_id,
                            order.user_id,
                            OrderStatus::Paid,
                            order.created_at.timestamp_millis(),
                        )
                        .await?;

                    tracing::info!(
                        "注文 {} の決済が完了しました: payment_id={}",
                        order_id,
                        event.payment_id
                    );
                }
            }
        }
        WebhookEventType::PaymentFailed => {
            if let Some(order_id) = event.order_id {
                // 決済失敗状態に更新
                order_repo
                    .update_payment_status(order_id, PaymentStatus::Failed)
                    .await?;

                tracing::warn!(
                    "注文 {} の決済が失敗しました: payment_id={}",
                    order_id,
                    event.payment_id
                );
            }
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
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
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
    Json(req): Json<CreateRefundRequest>,
) -> Result<Json<DataResponse<()>>> {
    req.validate()?;

    let order_repo = OrderRepository::new(state.db.anonymous());

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

