use serde::{Deserialize, Serialize};
use super::product::{ProductListItem, Breadcrumb, MetaData};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub parent_id: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryWithChildren {
    pub category: Category,
    pub children: Vec<Category>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryPageResponse {
    pub category: Category,
    pub products: Vec<ProductListItem>,
    pub pagination: Pagination,
    pub breadcrumbs: Vec<Breadcrumb>,
    pub subcategories: Vec<Category>,
    pub json_ld: String,
    pub meta: MetaData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pagination {
    pub page: u32,
    pub per_page: u32,
    pub total: u64,
    pub total_pages: u32,
    pub has_next: bool,
    pub has_prev: bool,
}
