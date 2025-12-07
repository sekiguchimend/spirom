use axum::{
    extract::{Path, Query, State},
    Json,
};

use crate::config::AppState;
use crate::db::repositories::{CategoryRepository, ProductRepository};
use crate::error::{AppError, Result};
use crate::models::{
    CategorySummary, DataResponse, PaginatedResponse, Product, ProductQuery, ProductSummary,
};

/// 商品一覧取得
pub async fn list_products(
    State(state): State<AppState>,
    Query(query): Query<ProductQuery>,
) -> Result<Json<PaginatedResponse<ProductSummary>>> {
    let product_repo = ProductRepository::new(state.db.anonymous());
    let category_repo = CategoryRepository::new(state.db.anonymous());

    let limit = query.pagination.limit();

    // カテゴリフィルタ
    let products = if let Some(category_slug) = &query.category {
        let category = category_repo
            .find_by_slug(category_slug)
            .await?
            .ok_or_else(|| AppError::NotFound("カテゴリが見つかりません".to_string()))?;

        product_repo.find_by_category(category.id, limit).await?
    } else if query.featured == Some(true) {
        product_repo.find_featured(limit).await?
    } else {
        let all_products = product_repo.find_all(limit).await?;
        all_products.into_iter().map(ProductSummary::from).collect()
    };

    // 価格フィルタ
    let filtered: Vec<ProductSummary> = products
        .into_iter()
        .filter(|p| {
            let min_ok = query.min_price.map(|min| p.price >= min).unwrap_or(true);
            let max_ok = query.max_price.map(|max| p.price <= max).unwrap_or(true);
            let active_ok = p.is_active;
            min_ok && max_ok && active_ok
        })
        .collect();

    let total = filtered.len() as i64;

    Ok(Json(PaginatedResponse::new(
        filtered,
        query.pagination.page,
        query.pagination.per_page,
        total,
    )))
}

/// 商品詳細取得
pub async fn get_product(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<DataResponse<Product>>> {
    let product_repo = ProductRepository::new(state.db.anonymous());
    let category_repo = CategoryRepository::new(state.db.anonymous());

    let mut product = product_repo
        .find_by_slug(&slug)
        .await?
        .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

    // カテゴリ情報を付与
    if let Some(category) = category_repo.find_by_id(product.category_id).await? {
        product.category = Some(CategorySummary::from(category));
    }

    Ok(Json(DataResponse::new(product)))
}

/// 注目商品取得
pub async fn get_featured_products(
    State(state): State<AppState>,
) -> Result<Json<DataResponse<Vec<ProductSummary>>>> {
    let product_repo = ProductRepository::new(state.db.anonymous());

    let products = product_repo.find_featured(20).await?;

    Ok(Json(DataResponse::new(products)))
}
