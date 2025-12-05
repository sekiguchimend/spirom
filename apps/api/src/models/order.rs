use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use super::OrderAddress;

/// 注文ステータス
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    #[default]
    PendingPayment,
    Paid,
    Processing,
    Shipped,
    Delivered,
    Cancelled,
    Refunded,
}

impl std::fmt::Display for OrderStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OrderStatus::PendingPayment => write!(f, "pending_payment"),
            OrderStatus::Paid => write!(f, "paid"),
            OrderStatus::Processing => write!(f, "processing"),
            OrderStatus::Shipped => write!(f, "shipped"),
            OrderStatus::Delivered => write!(f, "delivered"),
            OrderStatus::Cancelled => write!(f, "cancelled"),
            OrderStatus::Refunded => write!(f, "refunded"),
        }
    }
}

impl std::str::FromStr for OrderStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending_payment" => Ok(OrderStatus::PendingPayment),
            "paid" => Ok(OrderStatus::Paid),
            "processing" => Ok(OrderStatus::Processing),
            "shipped" => Ok(OrderStatus::Shipped),
            "delivered" => Ok(OrderStatus::Delivered),
            "cancelled" => Ok(OrderStatus::Cancelled),
            "refunded" => Ok(OrderStatus::Refunded),
            _ => Err(format!("Unknown order status: {}", s)),
        }
    }
}

/// 決済ステータス
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum PaymentStatus {
    #[default]
    Pending,
    Succeeded,
    Failed,
    Refunded,
    PartiallyRefunded,
}

/// 決済方法
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PaymentMethod {
    CreditCard,
    PayPay,
    RakutenPay,
    Konbini,
    BankTransfer,
}

impl std::fmt::Display for PaymentMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PaymentMethod::CreditCard => write!(f, "credit_card"),
            PaymentMethod::PayPay => write!(f, "paypay"),
            PaymentMethod::RakutenPay => write!(f, "rakuten_pay"),
            PaymentMethod::Konbini => write!(f, "konbini"),
            PaymentMethod::BankTransfer => write!(f, "bank_transfer"),
        }
    }
}

/// 注文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: Uuid,
    pub user_id: Uuid,
    pub order_number: String,
    pub status: OrderStatus,
    pub items: Vec<OrderItem>,
    pub subtotal: i64,
    pub shipping_fee: i64,
    pub tax: i64,
    pub total: i64,
    pub currency: String,
    pub shipping_address: OrderAddress,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub billing_address: Option<OrderAddress>,
    pub payment_method: PaymentMethod,
    pub payment_status: PaymentStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payment_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shipped_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delivered_at: Option<DateTime<Utc>>,
}

/// 注文アイテム
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderItem {
    pub product_id: Uuid,
    pub product_name: String,
    pub product_sku: String,
    pub price: i64,
    pub quantity: i32,
    pub subtotal: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
}

/// 注文サマリ（一覧用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderSummary {
    pub id: Uuid,
    pub order_number: String,
    pub status: OrderStatus,
    pub total: i64,
    pub currency: String,
    pub item_count: i32,
    pub created_at: DateTime<Utc>,
}

impl From<Order> for OrderSummary {
    fn from(o: Order) -> Self {
        let item_count = o.items.iter().map(|i| i.quantity).sum();
        Self {
            id: o.id,
            order_number: o.order_number,
            status: o.status,
            total: o.total,
            currency: o.currency,
            item_count,
            created_at: o.created_at,
        }
    }
}

/// 注文作成リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateOrderRequest {
    pub shipping_address_id: Uuid,
    pub billing_address_id: Option<Uuid>,
    pub payment_method: PaymentMethod,
    #[validate(length(max = 500))]
    pub notes: Option<String>,
}

/// 注文番号生成
pub fn generate_order_number() -> String {
    let now = chrono::Utc::now();
    let random: u32 = rand::random::<u32>() % 1000;
    format!(
        "ORD-{}-{:03}",
        now.format("%Y%m%d%H%M%S"),
        random
    )
}

/// 税率計算（10%）
pub fn calculate_tax(subtotal: i64) -> i64 {
    (subtotal as f64 * 0.1).round() as i64
}

/// 送料計算
pub fn calculate_shipping_fee(subtotal: i64) -> i64 {
    // 5000円以上で送料無料
    if subtotal >= 5000 {
        0
    } else {
        500
    }
}
