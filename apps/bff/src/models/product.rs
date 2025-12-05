use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub description: String,
    pub price: i64,
    pub compare_at_price: Option<i64>,
    pub currency: String,
    pub images: Vec<ProductImage>,
    pub category_id: String,
    pub category_name: String,
    pub stock_quantity: i32,
    pub is_available: bool,
    pub attributes: Vec<ProductAttribute>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductImage {
    pub url: String,
    pub alt: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductAttribute {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductListItem {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub price: i64,
    pub compare_at_price: Option<i64>,
    pub currency: String,
    pub image: Option<ProductImage>,
    pub category_name: String,
    pub is_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductDetailResponse {
    pub product: Product,
    pub related_products: Vec<ProductListItem>,
    pub breadcrumbs: Vec<Breadcrumb>,
    pub json_ld: String,
    pub meta: MetaData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Breadcrumb {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaData {
    pub title: String,
    pub description: String,
    pub canonical: String,
    pub og_image: Option<String>,
    pub og_type: String,
}
