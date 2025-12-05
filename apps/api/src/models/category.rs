use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

/// カテゴリ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
    pub is_active: bool,
    pub sort_order: i32,
    pub product_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// カテゴリツリー（子カテゴリ含む）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryTree {
    #[serde(flatten)]
    pub category: Category,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<CategoryTree>,
}

/// カテゴリ作成リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateCategoryRequest {
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    #[validate(length(min = 1, max = 100))]
    pub slug: String,
    #[validate(length(max = 1000))]
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
    pub image_url: Option<String>,
    pub sort_order: Option<i32>,
}

/// カテゴリ更新リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateCategoryRequest {
    #[validate(length(min = 1, max = 100))]
    pub name: Option<String>,
    #[validate(length(min = 1, max = 100))]
    pub slug: Option<String>,
    #[validate(length(max = 1000))]
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
    pub image_url: Option<String>,
    pub is_active: Option<bool>,
    pub sort_order: Option<i32>,
}

/// カテゴリ一覧レスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryListResponse {
    pub categories: Vec<Category>,
}

/// カテゴリツリーレスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryTreeResponse {
    pub categories: Vec<CategoryTree>,
}
