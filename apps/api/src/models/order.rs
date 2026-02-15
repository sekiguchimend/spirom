use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
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
            "pending" | "pending_payment" => Ok(OrderStatus::PendingPayment),
            "paid" => Ok(OrderStatus::Paid),
            "processing" => Ok(OrderStatus::Processing),
            "shipped" => Ok(OrderStatus::Shipped),
            "delivered" => Ok(OrderStatus::Delivered),
            "cancelled" => Ok(OrderStatus::Cancelled),
            "refunded" => Ok(OrderStatus::Refunded),
            _ => Ok(OrderStatus::PendingPayment), // デフォルト値としてPendingPaymentを返す
        }
    }
}

/// 決済ステータス
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum PaymentStatus {
    #[default]
    Pending,
    Paid,
    Succeeded,
    Failed,
    Refunding,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<Uuid>,
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
    // ゲスト注文用フィールド
    #[serde(default)]
    pub is_guest_order: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub guest_email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub guest_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub guest_phone: Option<String>,
    #[serde(skip)]
    pub guest_access_token_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub guest_token_expires_at: Option<DateTime<Utc>>,
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
    pub payment_status: PaymentStatus,
    pub total: i64,
    pub currency: String,
    pub item_count: i32,
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shipped_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delivered_at: Option<DateTime<Utc>>,
}

impl From<Order> for OrderSummary {
    fn from(o: Order) -> Self {
        let item_count = o.items.iter().map(|i| i.quantity).sum();
        Self {
            id: o.id,
            order_number: o.order_number,
            status: o.status,
            payment_status: o.payment_status,
            total: o.total,
            currency: o.currency,
            item_count,
            created_at: o.created_at,
            shipped_at: o.shipped_at,
            delivered_at: o.delivered_at,
        }
    }
}

/// 注文アイテムリクエスト
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct OrderItemRequest {
    pub product_id: Uuid,
    #[validate(range(min = 1, max = 99))]
    pub quantity: i32,
}

/// 注文作成リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
#[validate(schema(function = "validate_create_order_request"))]
pub struct CreateOrderRequest {
    /// 注文アイテム（指定された場合はカートではなくこちらを使用）
    /// 最大50アイテムまで（DoS対策）
    #[serde(default)]
    pub items: Option<Vec<OrderItemRequest>>,
    pub shipping_address_id: Uuid,
    pub billing_address_id: Option<Uuid>,
    pub payment_method: PaymentMethod,
    #[validate(length(max = 500))]
    pub notes: Option<String>,
}

/// 注文作成リクエストのバリデーション
fn validate_create_order_request(req: &CreateOrderRequest) -> Result<(), validator::ValidationError> {
    if let Some(items) = &req.items {
        // アイテム数上限チェック（DoS対策）
        if items.len() > 50 {
            let mut err = validator::ValidationError::new("too_many_items");
            err.message = Some("注文アイテムは最大50件までです".into());
            return Err(err);
        }
        // 重複商品チェック
        let mut seen = std::collections::HashSet::new();
        for item in items {
            if !seen.insert(item.product_id) {
                let mut err = validator::ValidationError::new("duplicate_product");
                err.message = Some("同じ商品が複数回指定されています".into());
                return Err(err);
            }
        }
    }
    Ok(())
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

/// 送料計算（全国一律750円）
pub fn calculate_shipping_fee(_subtotal: i64) -> i64 {
    750
}

// ============================================
// ゲストチェックアウト用構造体
// ============================================

/// ゲスト配送先住所
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct GuestShippingAddress {
    #[validate(length(min = 1, max = 100, message = "名前は1〜100文字で入力してください"))]
    pub name: String,
    #[validate(length(min = 7, max = 8, message = "郵便番号は7桁で入力してください"))]
    pub postal_code: String,
    #[validate(length(min = 1, max = 10, message = "都道府県を選択してください"))]
    pub prefecture: String,
    #[validate(length(min = 1, max = 100, message = "市区町村は1〜100文字で入力してください"))]
    pub city: String,
    #[validate(length(min = 1, max = 200, message = "住所は1〜200文字で入力してください"))]
    pub address_line1: String,
    #[validate(length(max = 200, message = "建物名は200文字以内で入力してください"))]
    pub address_line2: Option<String>,
    #[validate(length(min = 10, max = 14, message = "電話番号は10〜14文字で入力してください"))]
    pub phone: String,
}

impl GuestShippingAddress {
    /// GuestShippingAddressからOrderAddressに変換
    pub fn to_order_address(&self) -> OrderAddress {
        OrderAddress {
            name: self.name.clone(),
            postal_code: self.postal_code.clone(),
            prefecture: self.prefecture.clone(),
            city: self.city.clone(),
            address_line1: self.address_line1.clone(),
            address_line2: self.address_line2.clone(),
            phone: Some(self.phone.clone()),
        }
    }
}

/// ゲスト注文作成リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
#[validate(schema(function = "validate_create_guest_order_request"))]
pub struct CreateGuestOrderRequest {
    /// 配送先住所
    #[validate(nested)]
    pub shipping_address: GuestShippingAddress,
    /// 請求先住所（指定しない場合は配送先と同じ）
    #[validate(nested)]
    pub billing_address: Option<GuestShippingAddress>,
    /// 決済方法
    pub payment_method: PaymentMethod,
    /// 備考
    #[validate(length(max = 500))]
    pub notes: Option<String>,
    /// メールアドレス（任意、注文確認リンク送信用）
    #[validate(email(message = "正しいメールアドレスを入力してください"))]
    pub email: Option<String>,
    /// 注文アイテム（指定された場合はカートではなくこちらを使用）
    #[serde(default)]
    pub items: Option<Vec<OrderItemRequest>>,
}

/// ゲスト注文作成リクエストのバリデーション
fn validate_create_guest_order_request(req: &CreateGuestOrderRequest) -> Result<(), validator::ValidationError> {
    if let Some(items) = &req.items {
        // アイテム数上限チェック（DoS対策）
        if items.len() > 50 {
            let mut err = validator::ValidationError::new("too_many_items");
            err.message = Some("注文アイテムは最大50件までです".into());
            return Err(err);
        }
        // 重複商品チェック
        let mut seen = std::collections::HashSet::new();
        for item in items {
            if !seen.insert(item.product_id) {
                let mut err = validator::ValidationError::new("duplicate_product");
                err.message = Some("同じ商品が複数回指定されています".into());
                return Err(err);
            }
        }
    }
    Ok(())
}

/// ゲストアクセストークンを生成
pub fn generate_guest_access_token() -> (String, String) {
    let token = Uuid::new_v4().to_string();
    let hash = hash_guest_token(&token);
    (token, hash)
}

/// ゲストトークンをハッシュ化
pub fn hash_guest_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// ゲストトークンの有効期限（7日間）
pub fn guest_token_expiry() -> DateTime<Utc> {
    Utc::now() + chrono::Duration::days(7)
}
