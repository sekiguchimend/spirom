use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::AuthenticatedClient;
use crate::error::Result;
use crate::models::Category;

pub struct CategoryRepository {
    client: AuthenticatedClient,
}

impl CategoryRepository {
    pub fn new(client: AuthenticatedClient) -> Self {
        Self { client }
    }

    /// カテゴリ作成
    pub async fn create(&self, category: &Category) -> Result<Category> {
        let input = CategoryInput {
            id: category.id,
            slug: category.slug.clone(),
            name: category.name.clone(),
            description: category.description.clone(),
            parent_id: category.parent_id,
            image_url: category.image_url.clone(),
            is_active: category.is_active,
            sort_order: category.sort_order,
            product_count: category.product_count,
            created_at: category.created_at,
            updated_at: category.updated_at,
        };

        let result: CategoryRow = self.client.insert("categories", &input).await?;
        Ok(result.into_category())
    }

    /// IDでカテゴリ取得
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Category>> {
        let query = format!("id=eq.{}", id);
        let result: Option<CategoryRow> = self.client.select_single("categories", &query).await?;
        Ok(result.map(|r| r.into_category()))
    }

    /// スラッグでカテゴリ取得
    pub async fn find_by_slug(&self, slug: &str) -> Result<Option<Category>> {
        let query = format!("slug=eq.{}", urlencoding::encode(slug));
        let result: Option<CategoryRow> = self.client.select_single("categories", &query).await?;
        Ok(result.map(|r| r.into_category()))
    }

    /// 全カテゴリ取得
    pub async fn find_all(&self) -> Result<Vec<Category>> {
        let query = "order=sort_order.asc";
        let results: Vec<CategoryRow> = self.client.select("categories", query).await?;
        Ok(results.into_iter().map(|r| r.into_category()).collect())
    }

    /// アクティブなカテゴリのみ取得
    pub async fn find_active(&self) -> Result<Vec<Category>> {
        let query = "is_active=eq.true&order=sort_order.asc";
        let results: Vec<CategoryRow> = self.client.select("categories", query).await?;
        Ok(results.into_iter().map(|r| r.into_category()).collect())
    }

    /// 商品数を更新
    pub async fn update_product_count(&self, id: Uuid, count: i32) -> Result<()> {
        let query = format!("id=eq.{}", id);
        let update = ProductCountUpdate {
            product_count: count,
            updated_at: Utc::now(),
        };

        let _: Vec<CategoryRow> = self.client.update("categories", &query, &update).await?;
        Ok(())
    }

    /// カテゴリ削除
    pub async fn delete(&self, id: Uuid) -> Result<()> {
        let query = format!("id=eq.{}", id);
        self.client.delete("categories", &query).await
    }
}

// Supabase REST API用の構造体
#[derive(Debug, Serialize)]
struct CategoryInput {
    id: Uuid,
    slug: String,
    name: String,
    description: Option<String>,
    parent_id: Option<Uuid>,
    image_url: Option<String>,
    is_active: bool,
    sort_order: i32,
    product_count: i32,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct ProductCountUpdate {
    product_count: i32,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct CategoryRow {
    id: Uuid,
    slug: String,
    name: String,
    description: Option<String>,
    parent_id: Option<Uuid>,
    image_url: Option<String>,
    is_active: bool,
    sort_order: i32,
    product_count: i32,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl CategoryRow {
    fn into_category(self) -> Category {
        Category {
            id: self.id,
            slug: self.slug,
            name: self.name,
            description: self.description,
            parent_id: self.parent_id,
            image_url: self.image_url,
            is_active: self.is_active,
            sort_order: self.sort_order,
            product_count: self.product_count,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}
