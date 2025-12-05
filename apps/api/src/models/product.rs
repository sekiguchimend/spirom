use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use super::{Category, PaginationQuery, SortOrder};

/// 商品
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    pub description: String,
    pub price: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compare_at_price: Option<i64>,
    pub currency: String,
    pub category_id: Uuid,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<CategorySummary>,
    pub images: Vec<String>,
    pub stock: i32,
    pub sku: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weight: Option<i32>,
    pub is_active: bool,
    pub is_featured: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// カテゴリサマリ（商品に埋め込み用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategorySummary {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
}

impl From<Category> for CategorySummary {
    fn from(c: Category) -> Self {
        Self {
            id: c.id,
            slug: c.slug,
            name: c.name,
        }
    }
}

/// 商品一覧用サマリ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductSummary {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    pub price: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compare_at_price: Option<i64>,
    pub currency: String,
    pub images: Vec<String>,
    pub is_active: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<CategorySummary>,
}

impl From<Product> for ProductSummary {
    fn from(p: Product) -> Self {
        Self {
            id: p.id,
            slug: p.slug,
            name: p.name,
            price: p.price,
            compare_at_price: p.compare_at_price,
            currency: p.currency,
            images: p.images,
            is_active: p.is_active,
            category: p.category,
        }
    }
}

/// 商品作成リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateProductRequest {
    #[validate(length(min = 1, max = 200))]
    pub name: String,
    #[validate(length(min = 1, max = 200))]
    pub slug: String,
    #[validate(length(max = 10000))]
    pub description: String,
    #[validate(range(min = 0))]
    pub price: i64,
    pub compare_at_price: Option<i64>,
    pub category_id: Uuid,
    #[validate(length(min = 1))]
    pub images: Vec<String>,
    #[validate(range(min = 0))]
    pub stock: i32,
    #[validate(length(min = 1, max = 100))]
    pub sku: String,
    pub weight: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub metadata: Option<std::collections::HashMap<String, String>>,
}

/// 商品更新リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateProductRequest {
    #[validate(length(min = 1, max = 200))]
    pub name: Option<String>,
    #[validate(length(min = 1, max = 200))]
    pub slug: Option<String>,
    #[validate(length(max = 10000))]
    pub description: Option<String>,
    #[validate(range(min = 0))]
    pub price: Option<i64>,
    pub compare_at_price: Option<i64>,
    pub category_id: Option<Uuid>,
    pub images: Option<Vec<String>>,
    #[validate(range(min = 0))]
    pub stock: Option<i32>,
    pub weight: Option<i32>,
    pub is_active: Option<bool>,
    pub is_featured: Option<bool>,
    pub tags: Option<Vec<String>>,
    pub metadata: Option<std::collections::HashMap<String, String>>,
}

/// 商品検索クエリ
#[derive(Debug, Clone, Deserialize)]
pub struct ProductQuery {
    #[serde(flatten)]
    pub pagination: PaginationQuery,
    pub category: Option<String>,
    pub min_price: Option<i64>,
    pub max_price: Option<i64>,
    #[serde(default)]
    pub sort: ProductSortField,
    #[serde(default)]
    pub order: SortOrder,
    pub q: Option<String>,
    pub featured: Option<bool>,
}

/// 商品ソートフィールド
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum ProductSortField {
    Price,
    Name,
    #[default]
    CreatedAt,
}
