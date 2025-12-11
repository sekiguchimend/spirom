use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

/// 決済エラー
#[derive(Error, Debug)]
pub enum PaymentError {
    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Payment declined: {0}")]
    Declined(String),

    #[error("Payment provider error: {0}")]
    ProviderError(String),

    #[error("Webhook verification failed: {0}")]
    WebhookVerificationFailed(String),

    #[error("Network error: {0}")]
    NetworkError(String),
}

/// 決済インテント作成パラメータ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIntentParams {
    pub order_id: Uuid,
    pub amount: i64,
    pub currency: String,
    pub customer_email: String,
    pub customer_name: Option<String>,
    pub description: Option<String>,
    pub metadata: Option<std::collections::HashMap<String, String>>,
    pub shipping_address: Option<ShippingAddress>,
}

/// 配送先住所情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShippingAddress {
    pub name: String,
    pub postal_code: String,
    pub prefecture: String,
    pub city: String,
    pub address_line1: String,
    pub address_line2: Option<String>,
    pub phone: Option<String>,
}

/// 決済インテント
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentIntent {
    pub id: String,
    pub client_secret: String,
    pub amount: i64,
    pub currency: String,
    pub status: PaymentIntentStatus,
}

/// 決済インテントステータス
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PaymentIntentStatus {
    RequiresPaymentMethod,
    RequiresConfirmation,
    RequiresAction,
    Processing,
    Succeeded,
    Canceled,
}

/// 決済結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentResult {
    pub id: String,
    pub status: PaymentResultStatus,
    pub amount: i64,
    pub currency: String,
    pub paid_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// 決済結果ステータス
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PaymentResultStatus {
    Succeeded,
    Failed,
    Pending,
}

/// 返金結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefundResult {
    pub id: String,
    pub payment_id: String,
    pub amount: i64,
    pub status: RefundStatus,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// 返金ステータス
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RefundStatus {
    Pending,
    Succeeded,
    Failed,
}

/// Webhookイベント
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookEvent {
    pub event_type: WebhookEventType,
    pub payment_id: String,
    pub order_id: Option<Uuid>,
    pub data: serde_json::Value,
}

/// Webhookイベントタイプ
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WebhookEventType {
    PaymentSucceeded,
    PaymentFailed,
    RefundSucceeded,
    RefundFailed,
    Unknown,
}

/// 決済プロバイダトレイト
#[async_trait]
pub trait PaymentProvider: Send + Sync {
    /// 決済インテント作成
    async fn create_intent(&self, params: CreateIntentParams) -> Result<PaymentIntent, PaymentError>;

    /// 決済確定
    async fn confirm(&self, intent_id: &str) -> Result<PaymentResult, PaymentError>;

    /// 返金
    async fn refund(&self, payment_id: &str, amount: Option<i64>) -> Result<RefundResult, PaymentError>;

    /// Webhook署名検証
    fn verify_webhook(&self, payload: &[u8], signature: &str) -> Result<WebhookEvent, PaymentError>;

    /// プロバイダ名
    fn name(&self) -> &'static str;
}

/// ダミー決済プロバイダ（開発用）
pub struct DummyPaymentProvider;

#[async_trait]
impl PaymentProvider for DummyPaymentProvider {
    async fn create_intent(&self, params: CreateIntentParams) -> Result<PaymentIntent, PaymentError> {
        Ok(PaymentIntent {
            id: format!("pi_dummy_{}", Uuid::new_v4()),
            client_secret: format!("pi_dummy_{}_secret", Uuid::new_v4()),
            amount: params.amount,
            currency: params.currency,
            status: PaymentIntentStatus::RequiresPaymentMethod,
        })
    }

    async fn confirm(&self, intent_id: &str) -> Result<PaymentResult, PaymentError> {
        Ok(PaymentResult {
            id: intent_id.to_string(),
            status: PaymentResultStatus::Succeeded,
            amount: 0,
            currency: "JPY".to_string(),
            paid_at: Some(chrono::Utc::now()),
        })
    }

    async fn refund(&self, payment_id: &str, amount: Option<i64>) -> Result<RefundResult, PaymentError> {
        Ok(RefundResult {
            id: format!("re_dummy_{}", Uuid::new_v4()),
            payment_id: payment_id.to_string(),
            amount: amount.unwrap_or(0),
            status: RefundStatus::Succeeded,
            created_at: chrono::Utc::now(),
        })
    }

    fn verify_webhook(&self, _payload: &[u8], _signature: &str) -> Result<WebhookEvent, PaymentError> {
        Ok(WebhookEvent {
            event_type: WebhookEventType::PaymentSucceeded,
            payment_id: "dummy".to_string(),
            order_id: None,
            data: serde_json::json!({}),
        })
    }

    fn name(&self) -> &'static str {
        "dummy"
    }
}
