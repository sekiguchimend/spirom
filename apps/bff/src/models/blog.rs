use serde::{Deserialize, Serialize};
use super::product::{Breadcrumb, MetaData};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogPost {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub excerpt: Option<String>,
    pub content: String,
    pub featured_image: Option<BlogImage>,
    pub author: BlogAuthor,
    pub category: Option<BlogCategory>,
    pub tags: Vec<String>,
    pub published_at: String,
    pub updated_at: String,
    pub reading_time: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogImage {
    pub url: String,
    pub alt: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogAuthor {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub image: Option<String>,
    pub bio: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogCategory {
    pub id: String,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogListItem {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub excerpt: Option<String>,
    pub featured_image: Option<BlogImage>,
    pub author: BlogAuthor,
    pub published_at: String,
    pub reading_time: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogDetailResponse {
    pub post: BlogPost,
    pub related_posts: Vec<BlogListItem>,
    pub breadcrumbs: Vec<Breadcrumb>,
    pub json_ld: String,
    pub meta: MetaData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlogListResponse {
    pub posts: Vec<BlogListItem>,
    pub pagination: super::category::Pagination,
    pub meta: MetaData,
}
