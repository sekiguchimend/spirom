use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

/// 住所
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Address {
    pub id: Uuid,
    pub user_id: Uuid,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    pub postal_code: String,
    pub prefecture: String,
    pub city: String,
    pub address_line1: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address_line2: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
}

/// 住所作成リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateAddressRequest {
    #[validate(length(max = 50))]
    pub label: Option<String>,
    #[validate(length(min = 7, max = 8))]
    pub postal_code: String,
    #[validate(length(min = 1, max = 10))]
    pub prefecture: String,
    #[validate(length(min = 1, max = 100))]
    pub city: String,
    #[validate(length(min = 1, max = 200))]
    pub address_line1: String,
    #[validate(length(max = 200))]
    pub address_line2: Option<String>,
    #[validate(length(max = 20))]
    pub phone: Option<String>,
    #[serde(default)]
    pub is_default: bool,
}

/// 住所更新リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateAddressRequest {
    #[validate(length(max = 50))]
    pub label: Option<String>,
    #[validate(length(min = 7, max = 8))]
    pub postal_code: Option<String>,
    #[validate(length(min = 1, max = 10))]
    pub prefecture: Option<String>,
    #[validate(length(min = 1, max = 100))]
    pub city: Option<String>,
    #[validate(length(min = 1, max = 200))]
    pub address_line1: Option<String>,
    #[validate(length(max = 200))]
    pub address_line2: Option<String>,
    #[validate(length(max = 20))]
    pub phone: Option<String>,
    pub is_default: Option<bool>,
}

/// 注文用住所（埋め込み）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderAddress {
    pub name: String,
    pub postal_code: String,
    pub prefecture: String,
    pub city: String,
    pub address_line1: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address_line2: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
}

impl OrderAddress {
    pub fn from_address(address: &Address, name: String) -> Self {
        Self {
            name,
            postal_code: address.postal_code.clone(),
            prefecture: address.prefecture.clone(),
            city: address.city.clone(),
            address_line1: address.address_line1.clone(),
            address_line2: address.address_line2.clone(),
            phone: address.phone.clone(),
        }
    }
}
