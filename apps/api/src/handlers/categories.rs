use axum::{
    extract::{Path, Query, State},
    Json,
};

use crate::config::AppState;
use crate::db::repositories::{CategoryRepository, ProductRepository};
use crate::error::{AppError, Result};
use crate::models::{
    Category, CategoryListResponse, CategoryTree, CategoryTreeResponse, DataResponse,
    PaginatedResponse, PaginationQuery, ProductSummary,
};

/// カテゴリ一覧取得
pub async fn list_categories(
    State(state): State<AppState>,
) -> Result<Json<CategoryListResponse>> {
    let category_repo = CategoryRepository::new(state.db.anonymous());

    let categories = category_repo.find_active().await?;

    Ok(Json(CategoryListResponse { categories }))
}

/// カテゴリツリー取得
pub async fn get_category_tree(
    State(state): State<AppState>,
) -> Result<Json<CategoryTreeResponse>> {
    let category_repo = CategoryRepository::new(state.db.anonymous());

    let all_categories = category_repo.find_active().await?;

    // ルートカテゴリを取得
    let root_categories: Vec<&Category> = all_categories
        .iter()
        .filter(|c| c.parent_id.is_none())
        .collect();

    // ツリー構築
    let tree: Vec<CategoryTree> = root_categories
        .into_iter()
        .map(|root| build_category_tree(root.clone(), &all_categories))
        .collect();

    Ok(Json(CategoryTreeResponse { categories: tree }))
}

fn build_category_tree(category: Category, all: &[Category]) -> CategoryTree {
    let children: Vec<CategoryTree> = all
        .iter()
        .filter(|c| c.parent_id == Some(category.id))
        .map(|c| build_category_tree(c.clone(), all))
        .collect();

    CategoryTree { category, children }
}

/// カテゴリ詳細取得
pub async fn get_category(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<DataResponse<Category>>> {
    let category_repo = CategoryRepository::new(state.db.anonymous());

    let category = category_repo
        .find_by_slug(&slug)
        .await?
        .ok_or_else(|| AppError::NotFound("カテゴリが見つかりません".to_string()))?;

    Ok(Json(DataResponse::new(category)))
}

/// カテゴリ内の商品取得
pub async fn get_category_products(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    Query(query): Query<PaginationQuery>,
) -> Result<Json<PaginatedResponse<ProductSummary>>> {
    let category_repo = CategoryRepository::new(state.db.anonymous());
    let product_repo = ProductRepository::new(state.db.anonymous());

    let category = category_repo
        .find_by_slug(&slug)
        .await?
        .ok_or_else(|| AppError::NotFound("カテゴリが見つかりません".to_string()))?;

    let products = product_repo
        .find_by_category(category.id, query.limit())
        .await?;

    let total = products.len() as i64;

    Ok(Json(PaginatedResponse::new(
        products,
        query.page,
        query.per_page,
        total,
    )))
}
