use serde::{Deserialize, Serialize};
use super::product::{ProductListItem, MetaData};
use super::category::Category;
use super::blog::BlogListItem;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomePageResponse {
    pub hero: HeroSection,
    pub featured_products: Vec<ProductListItem>,
    pub new_arrivals: Vec<ProductListItem>,
    pub categories: Vec<Category>,
    pub latest_posts: Vec<BlogListItem>,
    pub json_ld: String,
    pub meta: MetaData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeroSection {
    pub title: String,
    pub subtitle: Option<String>,
    pub image_url: String,
    pub cta_text: String,
    pub cta_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchRequest {
    pub query: String,
    pub category: Option<String>,
    pub min_price: Option<i64>,
    pub max_price: Option<i64>,
    pub sort: Option<SearchSort>,
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SearchSort {
    Relevance,
    PriceAsc,
    PriceDesc,
    Newest,
    Popular,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    pub products: Vec<ProductListItem>,
    pub pagination: super::category::Pagination,
    pub facets: SearchFacets,
    pub meta: MetaData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchFacets {
    pub categories: Vec<FacetItem>,
    pub price_ranges: Vec<PriceRange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FacetItem {
    pub id: String,
    pub name: String,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceRange {
    pub min: i64,
    pub max: i64,
    pub count: u64,
}
