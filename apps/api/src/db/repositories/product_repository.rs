use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use crate::db::AuthenticatedClient;
use crate::error::{AppError, Result};
use crate::models::{CategorySummary, Product, ProductSummary};

pub struct ProductRepository {
    client: AuthenticatedClient,
}

impl ProductRepository {
    pub fn new(client: AuthenticatedClient) -> Self {
        Self { client }
    }

    /// 商品作成
    pub async fn create(&self, product: &Product) -> Result<Product> {
        let input = ProductInput {
            id: product.id,
            slug: product.slug.clone(),
            name: product.name.clone(),
            description: Some(product.description.clone()),
            price: product.price,
            compare_at_price: product.compare_at_price,
            currency: product.currency.clone(),
            category_id: Some(product.category_id),
            images: product.images.clone(),
            stock: product.stock,
            sku: Some(product.sku.clone()),
            weight: product.weight,
            is_active: product.is_active,
            is_featured: product.is_featured,
            tags: product.tags.clone().unwrap_or_default(),
            metadata: serde_json::to_value(&product.metadata).unwrap_or_default(),
            created_at: product.created_at,
            updated_at: product.updated_at,
        };

        let result: ProductRow = self.client.insert("products", &input).await?;
        Ok(result.into_product())
    }

    /// IDで商品取得
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Product>> {
        let query = format!("id=eq.{}&select=*,categories(id,slug,name)", id);
        let result: Option<ProductWithCategory> = self.client.select_single("products", &query).await?;
        Ok(result.map(|r| r.into_product()))
    }

    /// 複数IDで商品一括取得（N+1問題回避用）
    pub async fn find_by_ids(&self, ids: &[Uuid]) -> Result<HashMap<Uuid, Product>> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }

        let ids_str = ids.iter().map(|id| id.to_string()).collect::<Vec<_>>().join(",");
        let query = format!("id=in.({})", ids_str);
        let results: Vec<ProductWithCategory> = self.client.select("products", &query).await?;

        Ok(results.into_iter().map(|r| {
            let product = r.into_product();
            (product.id, product)
        }).collect())
    }

    /// スラッグで商品取得
    pub async fn find_by_slug(&self, slug: &str) -> Result<Option<Product>> {
        let query = format!("slug=eq.{}&select=*,categories(id,slug,name)", urlencoding::encode(slug));
        let result: Option<ProductWithCategory> = self.client.select_single("products", &query).await?;
        Ok(result.map(|r| r.into_product()))
    }

    /// カテゴリ別商品一覧取得
    pub async fn find_by_category(&self, category_id: Uuid, limit: i32) -> Result<Vec<ProductSummary>> {
        let query = format!(
            "category_id=eq.{}&is_active=eq.true&select=id,slug,name,price,compare_at_price,currency,images,is_active,categories(id,slug,name)&order=created_at.desc&limit={}",
            category_id, limit
        );
        let results: Vec<ProductSummaryWithCategory> = self.client.select("products", &query).await?;
        Ok(results.into_iter().map(|r| r.into_product_summary()).collect())
    }

    /// 注目商品取得
    pub async fn find_featured(&self, limit: i32) -> Result<Vec<ProductSummary>> {
        let query = format!(
            "is_featured=eq.true&is_active=eq.true&select=id,slug,name,price,compare_at_price,currency,images,is_active,categories(id,slug,name)&order=created_at.desc&limit={}",
            limit
        );
        let results: Vec<ProductSummaryWithCategory> = self.client.select("products", &query).await?;
        Ok(results.into_iter().map(|r| r.into_product_summary()).collect())
    }

    /// 全商品取得（ページネーション付き）
    pub async fn find_all(&self, limit: i32) -> Result<Vec<Product>> {
        let query = format!(
            "is_active=eq.true&select=*,categories(id,slug,name)&order=created_at.desc&limit={}",
            limit
        );
        let results: Vec<ProductWithCategory> = self.client.select("products", &query).await?;
        Ok(results.into_iter().map(|r| r.into_product()).collect())
    }

    /// 在庫更新
    pub async fn update_stock(&self, id: Uuid, stock: i32) -> Result<()> {
        let query = format!("id=eq.{}", id);
        let update = StockUpdate {
            stock,
            updated_at: Utc::now(),
        };

        let _: Vec<ProductRow> = self.client.update("products", &query, &update).await?;
        Ok(())
    }

    /// 在庫確保（原子操作: 同時購入で在庫マイナスにならないようにする）
    /// - `items`: [(product_id, quantity), ...]
    pub async fn reserve_stock_bulk(&self, items: &[(Uuid, i32)]) -> Result<bool> {
        #[derive(Serialize)]
        struct Item {
            product_id: Uuid,
            quantity: i32,
        }
        #[derive(Serialize)]
        struct Params {
            p_items: serde_json::Value,
        }

        let payload = items
            .iter()
            .map(|(product_id, quantity)| Item {
                product_id: *product_id,
                quantity: *quantity,
            })
            .collect::<Vec<_>>();

        let params = Params {
            p_items: serde_json::to_value(payload).unwrap_or_else(|_| serde_json::json!([])),
        };

        match self.client.rpc::<_, bool>("reserve_stock_bulk", &params).await {
            Ok(ok) => Ok(ok),
            Err(AppError::Database(msg))
                if msg.contains("\"code\":\"PGRST202\"") && msg.contains("reserve_stock_bulk") =>
            {
                Err(AppError::Internal(
                    "在庫確保RPC（reserve_stock_bulk）がDBに存在しません。\
                    Supabase側へ `apps/api/src/db/schema.rs` のSQL（reserve_stock_bulk / release_stock_bulk）を適用してください。\
                    適用後、PostgRESTのスキーマキャッシュ反映に少し時間がかかる場合があります。"
                        .to_string(),
                ))
            }
            Err(e) => Err(e),
        }
    }

    /// 在庫解放（原子操作）
    pub async fn release_stock_bulk(&self, items: &[(Uuid, i32)]) -> Result<bool> {
        #[derive(Serialize)]
        struct Item {
            product_id: Uuid,
            quantity: i32,
        }
        #[derive(Serialize)]
        struct Params {
            p_items: serde_json::Value,
        }

        let payload = items
            .iter()
            .map(|(product_id, quantity)| Item {
                product_id: *product_id,
                quantity: *quantity,
            })
            .collect::<Vec<_>>();

        let params = Params {
            p_items: serde_json::to_value(payload).unwrap_or_else(|_| serde_json::json!([])),
        };

        match self.client.rpc::<_, bool>("release_stock_bulk", &params).await {
            Ok(ok) => Ok(ok),
            Err(AppError::Database(msg))
                if msg.contains("\"code\":\"PGRST202\"") && msg.contains("release_stock_bulk") =>
            {
                Err(AppError::Internal(
                    "在庫解放RPC（release_stock_bulk）がDBに存在しません。\
                    Supabase側へ `apps/api/src/db/schema.rs` のSQL（reserve_stock_bulk / release_stock_bulk）を適用してください。\
                    適用後、PostgRESTのスキーマキャッシュ反映に少し時間がかかる場合があります。"
                        .to_string(),
                ))
            }
            Err(e) => Err(e),
        }
    }

    /// 商品削除
    pub async fn delete(&self, id: Uuid) -> Result<()> {
        let query = format!("id=eq.{}", id);
        self.client.delete("products", &query).await
    }
}

// Supabase REST API用の構造体
#[derive(Debug, Serialize)]
struct ProductInput {
    id: Uuid,
    slug: String,
    name: String,
    description: Option<String>,
    price: i64,
    compare_at_price: Option<i64>,
    currency: String,
    category_id: Option<Uuid>,
    images: Vec<String>,
    stock: i32,
    sku: Option<String>,
    weight: Option<i32>,
    is_active: bool,
    is_featured: bool,
    tags: Vec<String>,
    metadata: serde_json::Value,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct StockUpdate {
    stock: i32,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct ProductRow {
    id: Uuid,
    slug: String,
    name: String,
    description: Option<String>,
    price: i64,
    compare_at_price: Option<i64>,
    currency: String,
    category_id: Option<Uuid>,
    images: Vec<String>,
    stock: i32,
    sku: Option<String>,
    weight: Option<i32>,
    is_active: bool,
    is_featured: bool,
    tags: Vec<String>,
    metadata: serde_json::Value,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl ProductRow {
    fn into_product(self) -> Product {
        Product {
            id: self.id,
            slug: self.slug,
            name: self.name,
            description: self.description.unwrap_or_default(),
            price: self.price,
            compare_at_price: self.compare_at_price,
            currency: self.currency,
            category_id: self.category_id.unwrap_or_default(),
            images: self.images,
            stock: self.stock,
            sku: self.sku.unwrap_or_default(),
            weight: self.weight,
            is_active: self.is_active,
            is_featured: self.is_featured,
            tags: Some(self.tags),
            metadata: serde_json::from_value(self.metadata).ok(),
            category: None,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(Debug, Deserialize)]
struct CategoryRef {
    id: Uuid,
    slug: String,
    name: String,
}

#[derive(Debug, Deserialize)]
struct ProductWithCategory {
    id: Uuid,
    slug: String,
    name: String,
    description: Option<String>,
    price: i64,
    compare_at_price: Option<i64>,
    currency: String,
    category_id: Option<Uuid>,
    images: Vec<String>,
    stock: i32,
    sku: Option<String>,
    weight: Option<i32>,
    is_active: bool,
    is_featured: bool,
    tags: Vec<String>,
    metadata: serde_json::Value,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    categories: Option<CategoryRef>,
}

impl ProductWithCategory {
    fn into_product(self) -> Product {
        let category = self.categories.map(|c| CategorySummary {
            id: c.id,
            slug: c.slug,
            name: c.name,
        });

        Product {
            id: self.id,
            slug: self.slug,
            name: self.name,
            description: self.description.unwrap_or_default(),
            price: self.price,
            compare_at_price: self.compare_at_price,
            currency: self.currency,
            category_id: self.category_id.unwrap_or_default(),
            images: self.images,
            stock: self.stock,
            sku: self.sku.unwrap_or_default(),
            weight: self.weight,
            is_active: self.is_active,
            is_featured: self.is_featured,
            tags: Some(self.tags),
            metadata: serde_json::from_value(self.metadata).ok(),
            category,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(Debug, Deserialize)]
struct ProductSummaryWithCategory {
    id: Uuid,
    slug: String,
    name: String,
    price: i64,
    compare_at_price: Option<i64>,
    currency: String,
    images: Vec<String>,
    is_active: bool,
    categories: Option<CategoryRef>,
}

impl ProductSummaryWithCategory {
    fn into_product_summary(self) -> ProductSummary {
        let category = self.categories.map(|c| CategorySummary {
            id: c.id,
            slug: c.slug,
            name: c.name,
        });

        ProductSummary {
            id: self.id,
            slug: self.slug,
            name: self.name,
            price: self.price,
            compare_at_price: self.compare_at_price,
            currency: self.currency,
            images: self.images,
            is_active: self.is_active,
            category,
        }
    }
}
