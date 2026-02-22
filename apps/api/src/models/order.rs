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

/// 国コードからEMS地帯を取得
/// 日本郵便EMSの地帯区分に基づく
/// - 第1地帯: 中国・韓国・台湾
/// - 第2地帯: その他アジア
/// - 第3地帯: ヨーロッパ・オセアニア・カナダ・中近東
/// - 第4地帯: アメリカ
/// - 第5地帯: 南米・アフリカ
fn get_ems_zone(country_code: &str) -> &'static str {
    match country_code {
        // 国内
        "JP" => "domestic",
        // 第1地帯: 東アジア（中国・韓国・台湾・香港）
        "CN" | "KR" | "TW" | "HK" => "zone1_east_asia",
        // 第2地帯: その他アジア
        "SG" | "TH" | "VN" | "MY" | "ID" | "PH" | "IN" | "BD" | "PK" | "LK" |
        "NP" | "MM" | "KH" | "LA" | "BN" | "MO" | "MN" => "zone2_asia",
        // 第4地帯: アメリカ（グアム等含む）
        "US" | "GU" | "PR" | "VI" | "AS" | "MP" => "zone4_usa",
        // 第3地帯: ヨーロッパ
        "GB" | "DE" | "FR" | "IT" | "ES" | "NL" | "BE" | "AT" | "CH" | "SE" |
        "NO" | "DK" | "FI" | "PL" | "PT" | "IE" | "GR" | "CZ" | "HU" | "RO" |
        "SK" | "HR" | "SI" | "BG" | "LT" | "LV" | "EE" | "LU" | "MT" | "CY" |
        "IS" | "RU" | "UA" | "BY" | "MD" => "zone3_europe",
        // 第3地帯: オセアニア
        "AU" | "NZ" | "FJ" | "PG" | "NC" | "PF" => "zone3_oceania",
        // 第3地帯: カナダ・メキシコ
        "CA" | "MX" => "zone3_north_america",
        // 第3地帯: 中近東
        "AE" | "SA" | "IL" | "TR" | "QA" | "KW" | "BH" | "OM" | "JO" | "LB" |
        "EG" | "IR" | "IQ" => "zone3_middle_east",
        // 第5地帯: 南米
        "BR" | "AR" | "CL" | "CO" | "PE" | "VE" | "EC" | "UY" | "PY" | "BO" => "zone5_south_america",
        // 第5地帯: アフリカ
        "ZA" | "NG" | "KE" | "GH" | "TZ" | "ET" | "MA" | "TN" | "SN" => "zone5_africa",
        // その他はデフォルトで第5地帯扱い
        _ => "zone5_other",
    }
}

/// 送料計算（日本郵便EMS地帯別料金に基づく）
///
/// ## 料金体系（1kg想定、梱包込みアパレル商品）
/// - 国内（ゆうパック60サイズ相当）: ¥700（¥10,000以上で無料）
/// - 第1地帯（東アジア）: ¥2,000（¥20,000以上で無料）
/// - 第2地帯（その他アジア）: ¥3,000（¥30,000以上で無料）
/// - 第3地帯（欧州・オセアニア・カナダ・中近東）: ¥4,500（¥50,000以上で無料）
/// - 第4地帯（アメリカ）: ¥5,500（¥50,000以上で無料）
/// - 第5地帯（南米・アフリカ等）: ¥5,500（¥60,000以上で無料）
///
/// 参考: 日本郵便EMS料金表 https://www.post.japanpost.jp/int/charge/list/
pub fn calculate_shipping_fee(subtotal: i64, country_code: &str) -> i64 {
    let zone = get_ems_zone(country_code);

    match zone {
        // 国内配送（ゆうパック60サイズ全国平均）
        "domestic" => {
            if subtotal >= 10000 { 0 } else { 700 }
        }
        // 第1地帯: 東アジア（EMS 1kg: ¥2,200）
        "zone1_east_asia" => {
            if subtotal >= 20000 { 0 } else { 2000 }
        }
        // 第2地帯: その他アジア（EMS 1kg: ¥3,150）
        "zone2_asia" => {
            if subtotal >= 30000 { 0 } else { 3000 }
        }
        // 第3地帯: ヨーロッパ・オセアニア・カナダ・中近東（EMS 1kg: ¥4,400）
        "zone3_europe" | "zone3_oceania" | "zone3_north_america" | "zone3_middle_east" => {
            if subtotal >= 50000 { 0 } else { 4500 }
        }
        // 第4地帯: アメリカ（EMS 1kg: ¥5,300）
        "zone4_usa" => {
            if subtotal >= 50000 { 0 } else { 5500 }
        }
        // 第5地帯: 南米・アフリカ等（EMS 1kg: ¥5,100）
        _ => {
            if subtotal >= 60000 { 0 } else { 5500 }
        }
    }
}

// ============================================
// ゲストチェックアウト用構造体
// ============================================

/// ゲスト配送先住所
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct GuestShippingAddress {
    #[validate(length(min = 1, max = 100, message = "名前は1〜100文字で入力してください"))]
    pub name: String,
    /// 国コード（ISO 3166-1 alpha-2、例: JP, US, CN）
    #[validate(length(min = 2, max = 2, message = "国コードは2文字で入力してください"))]
    #[serde(default = "default_country")]
    pub country: String,
    #[validate(length(min = 1, max = 20, message = "郵便番号を入力してください"))]
    pub postal_code: String,
    #[validate(length(min = 1, max = 50, message = "都道府県/州を入力してください"))]
    pub prefecture: String,
    #[validate(length(min = 1, max = 100, message = "市区町村は1〜100文字で入力してください"))]
    pub city: String,
    #[validate(length(min = 1, max = 200, message = "住所は1〜200文字で入力してください"))]
    pub address_line1: String,
    #[validate(length(max = 200, message = "建物名は200文字以内で入力してください"))]
    pub address_line2: Option<String>,
    #[validate(length(min = 6, max = 20, message = "電話番号を正しく入力してください"))]
    pub phone: String,
}

/// デフォルト国コード（JP）
fn default_country() -> String {
    "JP".to_string()
}

impl GuestShippingAddress {
    /// GuestShippingAddressからOrderAddressに変換
    pub fn to_order_address(&self) -> OrderAddress {
        OrderAddress {
            name: self.name.clone(),
            country: self.country.clone(),
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
