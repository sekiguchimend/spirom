use axum::{
    extract::{Path, State},
    Extension, Json,
};
use chrono::Utc;
use crate::handlers::users::ensure_user_profile;
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::{ProductRepository, ReviewRepository, UserRepository};
use crate::error::{AppError, Result};
use crate::models::{
    AuthenticatedUser, CreateReviewRequest, DataResponse, PaginatedResponse, Review, ReviewStats,
};

/// 商品のレビュー一覧取得
pub async fn list_reviews(
    State(state): State<AppState>,
    Path(product_id): Path<Uuid>,
) -> Result<Json<PaginatedResponse<Review>>> {
    let review_repo = ReviewRepository::new(state.db.anonymous());

    let reviews = review_repo.find_by_product(product_id, 50).await?;
    let total = reviews.len() as i64;

    Ok(Json(PaginatedResponse::new(reviews, 1, 50, total)))
}

/// 商品のレビュー統計取得
pub async fn get_review_stats(
    State(state): State<AppState>,
    Path(product_id): Path<Uuid>,
) -> Result<Json<DataResponse<ReviewStats>>> {
    let review_repo = ReviewRepository::new(state.db.anonymous());

    let stats = review_repo.get_stats(product_id).await?;

    Ok(Json(DataResponse::new(stats)))
}

/// レビュー投稿
pub async fn create_review(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    Path(product_id): Path<Uuid>,
    Json(req): Json<CreateReviewRequest>,
) -> Result<Json<DataResponse<Review>>> {
    req.validate()?;

    let review_repo = ReviewRepository::new(state.db.anonymous());
    let product_repo = ProductRepository::new(state.db.anonymous());

    // 商品存在確認
    product_repo
        .find_by_id(product_id)
        .await?
        .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

    // 既にレビュー済みかチェック
    if review_repo.has_reviewed(auth_user.id, product_id).await? {
        return Err(AppError::Conflict("この商品には既にレビューを投稿しています".to_string()));
    }

    // ユーザー情報取得（無ければSupabase Authから同期して作成）
    let user = ensure_user_profile(&state, &auth_user, &token).await?;

    // 購入済みかチェック
    let is_verified_purchase = review_repo.has_purchased(auth_user.id, product_id).await?;

    let review = Review {
        id: Uuid::new_v4(),
        product_id,
        user_id: auth_user.id,
        user_name: user.name,
        rating: req.rating,
        title: req.title,
        content: req.content,
        is_verified_purchase,
        is_approved: true, // 自動承認（本番では管理者承認フローが必要）
        created_at: Utc::now(),
    };

    review_repo.create(&review).await?;

    Ok(Json(DataResponse::new(review)))
}
