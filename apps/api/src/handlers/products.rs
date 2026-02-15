use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use chrono::Utc;
use uuid::Uuid;

use crate::config::AppState;
use crate::db::repositories::{CategoryRepository, ProductRepository, ProductUpdateInput, VariantUpdateInput};
use crate::error::{AppError, Result};
use crate::models::{
    AdminCreateProductRequest, AdminUpdateProductRequest, CategorySummary, CreateVariantsRequest,
    DataResponse, PaginatedResponse, Product, ProductQuery, ProductSummary, ProductVariant,
    UpdateVariantRequest,
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
    if let Some(cat_id) = product.category_id {
        if let Some(category) = category_repo.find_by_id(cat_id).await? {
            product.category = Some(CategorySummary::from(category));
        }
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

/// 商品削除（管理者専用）
/// 注: admin_middlewareで管理者権限チェック済み
/// RLSポリシーで管理者のみ削除可能
///
/// 外部キー制約:
/// - order_items: ON DELETE SET NULL（注文履歴は保持、product_idがNULLになる）
/// - cart_items: ON DELETE CASCADE（カートから自動削除）
/// - product_variants: ON DELETE CASCADE（バリアントも自動削除）
pub async fn delete_product(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    let product_repo = ProductRepository::new(state.db.with_auth(&token));

    // 商品が存在するか確認
    let product = product_repo
        .find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

    // 商品を削除（外部キー制約でcart_items/variantsはCASCADE削除、order_itemsはSET NULL）
    product_repo.delete(id).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": format!("商品「{}」を削除しました", product.name)
    })))
}

// ========== 管理者専用エンドポイント ==========

/// 商品作成（管理者専用）
pub async fn create_product(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Json(req): Json<AdminCreateProductRequest>,
) -> Result<Json<DataResponse<Product>>> {
    let product_repo = ProductRepository::new(state.db.with_auth(&token));

    let now = Utc::now();
    let product = Product {
        id: Uuid::new_v4(),
        slug: req.slug,
        name: req.name,
        description: req.description,
        price: req.price,
        compare_at_price: req.compare_at_price,
        currency: "JPY".to_string(),
        category_id: req.category_id,
        category: None,
        images: req.images,
        stock: req.stock,
        sku: req.sku,
        weight: req.weight,
        is_active: req.is_active,
        is_featured: req.is_featured,
        tags: Some(req.tags),
        metadata: None,
        created_at: now,
        updated_at: now,
    };

    let created = product_repo.create(&product).await?;

    Ok(Json(DataResponse::new(created)))
}

/// 商品更新（管理者専用）
pub async fn update_product(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Path(id): Path<Uuid>,
    Json(req): Json<AdminUpdateProductRequest>,
) -> Result<Json<DataResponse<Product>>> {
    let product_repo = ProductRepository::new(state.db.with_auth(&token));

    // 商品が存在するか確認
    product_repo
        .find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

    let updates = ProductUpdateInput {
        name: req.name,
        slug: req.slug,
        description: req.description,
        price: req.price,
        compare_at_price: req.compare_at_price,
        stock: req.stock,
        is_active: req.is_active,
        is_featured: req.is_featured,
        updated_at: Utc::now(),
    };

    let updated = product_repo.update(id, &updates).await?;

    Ok(Json(DataResponse::new(updated)))
}

/// バリアント一覧取得
pub async fn list_variants(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<DataResponse<Vec<ProductVariant>>>> {
    let product_repo = ProductRepository::new(state.db.anonymous());

    // slugから商品を取得
    let product = product_repo
        .find_by_slug(&slug)
        .await?
        .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

    let variants = product_repo.find_variants_by_product(product.id).await?;

    Ok(Json(DataResponse::new(variants)))
}

/// バリアント一括作成（管理者専用）
pub async fn create_variants(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateVariantsRequest>,
) -> Result<Json<DataResponse<Vec<ProductVariant>>>> {
    let product_repo = ProductRepository::new(state.db.with_auth(&token));

    // 商品が存在するか確認
    product_repo
        .find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

    let now = Utc::now();
    let mut created_variants = Vec::new();

    for (i, input) in req.variants.into_iter().enumerate() {
        let variant = ProductVariant {
            id: Uuid::new_v4(),
            product_id: id,
            size: input.size,
            sku: None,
            stock: input.stock,
            price_adjustment: input.price_adjustment,
            sort_order: input.sort_order.max(i as i32),
            is_active: input.is_active,
            body_length: input.body_length,
            body_width: input.body_width,
            shoulder_width: input.shoulder_width,
            sleeve_length: input.sleeve_length,
            created_at: now,
            updated_at: now,
        };

        let created = product_repo.create_variant(&variant).await?;
        created_variants.push(created);
    }

    Ok(Json(DataResponse::new(created_variants)))
}

/// バリアント更新（管理者専用）
pub async fn update_variant(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Path((product_id, variant_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateVariantRequest>,
) -> Result<Json<DataResponse<ProductVariant>>> {
    let product_repo = ProductRepository::new(state.db.with_auth(&token));

    // 商品が存在するか確認
    product_repo
        .find_by_id(product_id)
        .await?
        .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

    let updates = VariantUpdateInput {
        stock: req.stock,
        price_adjustment: req.price_adjustment,
        is_active: req.is_active,
        body_length: req.body_length,
        body_width: req.body_width,
        shoulder_width: req.shoulder_width,
        sleeve_length: req.sleeve_length,
        updated_at: Utc::now(),
    };

    let updated = product_repo.update_variant(variant_id, &updates).await?;

    Ok(Json(DataResponse::new(updated)))
}

/// バリアント削除（管理者専用）
pub async fn delete_variant(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Path((product_id, variant_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    let product_repo = ProductRepository::new(state.db.with_auth(&token));

    // 商品が存在するか確認
    product_repo
        .find_by_id(product_id)
        .await?
        .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

    product_repo.delete_variant(variant_id).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "バリアントを削除しました"
    })))
}
