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

/// 商品バリアント（サイズ別在庫）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductVariant {
    pub id: Uuid,
    pub product_id: Uuid,
    pub size: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sku: Option<String>,
    pub stock: i32,
    pub price_adjustment: i64,
    pub sort_order: i32,
    pub is_active: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_length: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_width: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shoulder_width: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sleeve_length: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// バリアント作成リクエスト（単一）
#[derive(Debug, Clone, Deserialize)]
pub struct CreateVariantInput {
    pub size: String,
    pub stock: i32,
    #[serde(default)]
    pub price_adjustment: i64,
    #[serde(default)]
    pub sort_order: i32,
    #[serde(default = "default_true")]
    pub is_active: bool,
    pub body_length: Option<i32>,
    pub body_width: Option<i32>,
    pub shoulder_width: Option<i32>,
    pub sleeve_length: Option<i32>,
}

fn default_true() -> bool {
    true
}

/// バリアント一括作成リクエスト
#[derive(Debug, Clone, Deserialize)]
pub struct CreateVariantsRequest {
    pub variants: Vec<CreateVariantInput>,
}

/// バリアント更新リクエスト
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateVariantRequest {
    pub stock: Option<i32>,
    pub price_adjustment: Option<i64>,
    pub is_active: Option<bool>,
    pub body_length: Option<i32>,
    pub body_width: Option<i32>,
    pub shoulder_width: Option<i32>,
    pub sleeve_length: Option<i32>,
}

/// 商品作成リクエスト（管理者用）
#[derive(Debug, Clone, Deserialize)]
pub struct AdminCreateProductRequest {
    pub name: String,
    pub slug: String,
    #[serde(default)]
    pub description: String,
    pub price: i64,
    pub compare_at_price: Option<i64>,
    pub category_id: Option<Uuid>,
    #[serde(default)]
    pub images: Vec<String>,
    #[serde(default)]
    pub stock: i32,
    #[serde(default)]
    pub sku: String,
    pub weight: Option<i32>,
    #[serde(default = "default_true")]
    pub is_active: bool,
    #[serde(default)]
    pub is_featured: bool,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// 商品更新リクエスト（管理者用）
#[derive(Debug, Clone, Deserialize)]
pub struct AdminUpdateProductRequest {
    pub name: Option<String>,
    pub slug: Option<String>,
    pub description: Option<String>,
    pub price: Option<i64>,
    pub compare_at_price: Option<i64>,
    pub stock: Option<i32>,
    pub is_active: Option<bool>,
    pub is_featured: Option<bool>,
    pub product_type: Option<String>,
    pub material: Option<String>,
    pub material_detail: Option<String>,
}
