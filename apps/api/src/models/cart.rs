use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

/// カートアイテム
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CartItem {
    pub product_id: Uuid,
    pub product_name: String,
    pub product_slug: String,
    pub price: i64,
    pub quantity: i32,
    pub subtotal: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
    pub added_at: DateTime<Utc>,
}

/// カート
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cart {
    pub session_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<Uuid>,
    pub items: Vec<CartItem>,
    pub subtotal: i64,
    pub item_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Cart {
    pub fn new(session_id: String) -> Self {
        let now = Utc::now();
        Self {
            session_id,
            user_id: None,
            items: vec![],
            subtotal: 0,
            item_count: 0,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn calculate_totals(&mut self) {
        self.subtotal = self.items.iter().map(|item| item.subtotal).sum();
        self.item_count = self.items.iter().map(|item| item.quantity).sum();
    }
}

/// カートレスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CartResponse {
    pub session_id: String,
    pub items: Vec<CartItem>,
    pub subtotal: i64,
    pub item_count: i32,
}

impl From<Cart> for CartResponse {
    fn from(cart: Cart) -> Self {
        Self {
            session_id: cart.session_id,
            items: cart.items,
            subtotal: cart.subtotal,
            item_count: cart.item_count,
        }
    }
}

/// カートに追加リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct AddToCartRequest {
    pub product_id: Uuid,
    #[validate(range(min = 1, max = 99))]
    pub quantity: i32,
}

/// カートアイテム更新リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateCartItemRequest {
    #[validate(range(min = 1, max = 99))]
    pub quantity: i32,
}

/// カート統合リクエスト（ログイン時）
#[derive(Debug, Clone, Deserialize)]
pub struct MergeCartRequest {
    pub guest_session_id: String,
}
