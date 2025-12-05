use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};

use crate::config::AppState;
use crate::handlers;
use crate::middleware::{auth_middleware, admin_middleware};

pub fn create_router(state: AppState) -> Router {
    let public_routes = Router::new()
        // ヘルスチェック
        .route("/health", get(handlers::health::health_check))
        .route("/health/live", get(handlers::health::liveness))
        .route("/health/ready", get(handlers::health::readiness))
        // 認証
        .route("/api/v1/auth/register", post(handlers::auth::register))
        .route("/api/v1/auth/login", post(handlers::auth::login))
        .route("/api/v1/auth/forgot-password", post(handlers::auth::forgot_password))
        .route("/api/v1/auth/reset-password", post(handlers::auth::reset_password))
        // 商品（公開）
        .route("/api/v1/products", get(handlers::products::list_products))
        .route("/api/v1/products/featured", get(handlers::products::get_featured_products))
        .route("/api/v1/products/:slug", get(handlers::products::get_product))
        // カテゴリ（公開）
        .route("/api/v1/categories", get(handlers::categories::list_categories))
        .route("/api/v1/categories/tree", get(handlers::categories::get_category_tree))
        .route("/api/v1/categories/:slug", get(handlers::categories::get_category))
        .route("/api/v1/categories/:slug/products", get(handlers::categories::get_category_products))
        // カート（公開：セッションベース）
        .route("/api/v1/cart", get(handlers::cart::get_cart))
        .route("/api/v1/cart", delete(handlers::cart::clear_cart))
        .route("/api/v1/cart/items", post(handlers::cart::add_to_cart))
        .route("/api/v1/cart/items/:product_id", put(handlers::cart::update_cart_item))
        .route("/api/v1/cart/items/:product_id", delete(handlers::cart::remove_from_cart))
        // レビュー（読み取りは公開）
        .route("/api/v1/products/:id/reviews", get(handlers::reviews::list_reviews))
        .route("/api/v1/products/:id/reviews/stats", get(handlers::reviews::get_review_stats));

    let auth_routes = Router::new()
        // 認証
        .route("/api/v1/auth/logout", post(handlers::auth::logout))
        .route("/api/v1/auth/refresh", post(handlers::auth::refresh_token))
        // ユーザー
        .route("/api/v1/users/me", get(handlers::users::get_me))
        .route("/api/v1/users/me", put(handlers::users::update_me))
        .route("/api/v1/users/me/addresses", get(handlers::users::list_addresses))
        .route("/api/v1/users/me/addresses", post(handlers::users::create_address))
        .route("/api/v1/users/me/addresses/:id", put(handlers::users::update_address))
        .route("/api/v1/users/me/addresses/:id", delete(handlers::users::delete_address))
        // カート（認証：統合機能）
        .route("/api/v1/cart/merge", post(handlers::cart::merge_cart))
        // 注文
        .route("/api/v1/orders", post(handlers::orders::create_order))
        .route("/api/v1/orders", get(handlers::orders::list_orders))
        .route("/api/v1/orders/:id", get(handlers::orders::get_order))
        .route("/api/v1/orders/:id/cancel", post(handlers::orders::cancel_order))
        // レビュー（投稿は認証必要）
        .route("/api/v1/products/:id/reviews", post(handlers::reviews::create_review))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    Router::new()
        .merge(public_routes)
        .merge(auth_routes)
        .with_state(state)
}
