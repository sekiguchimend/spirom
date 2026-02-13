use axum::{
    middleware,
    routing::{delete, get, patch, post, put},
    Router,
};

use crate::config::AppState;
use crate::handlers;
use crate::middleware::{
    auth_middleware, admin_middleware,
    rate_limiter::{payment_rate_limiter_middleware, contact_rate_limiter_middleware},
    session::{session_signature_middleware, bff_proxy_token_middleware},
};

pub fn create_router(state: AppState) -> Router {
    let public_routes = Router::new()
        // ヘルスチェック
        .route("/health", get(handlers::health::health_check))
        .route("/health/live", get(handlers::health::liveness))
        .route("/health/ready", get(handlers::health::readiness))
        // 認証（Supabase Auth経由）
        .route("/api/v1/auth/register", post(handlers::auth::register))
        .route("/api/v1/auth/login", post(handlers::auth::login))
        .route("/api/v1/auth/refresh", post(handlers::auth::refresh_token))
        // 商品（公開）
        .route("/api/v1/products", get(handlers::products::list_products))
        .route("/api/v1/products/featured", get(handlers::products::get_featured_products))
        .route("/api/v1/products/:slug", get(handlers::products::get_product))
        .route("/api/v1/products/:slug/variants", get(handlers::products::list_variants))
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
        .route("/api/v1/products/:id/reviews/stats", get(handlers::reviews::get_review_stats))
        // Webhook（公開：署名検証あり）
        .route("/api/v1/webhooks/stripe", post(handlers::payments::handle_webhook));

    // お問い合わせルート（認証必須、専用レート制限）
    // スパム対策: 1IPあたり1時間に5回まで
    let contact_routes = Router::new()
        .route("/api/v1/contact", post(handlers::contact::submit_contact))
        .layer(middleware::from_fn(contact_rate_limiter_middleware))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
        .layer(middleware::from_fn(session_signature_middleware))
        .layer(middleware::from_fn(bff_proxy_token_middleware));

    // 決済ルート（認証 + 専用レート制限）
    // カードテスティング攻撃対策: 1IPあたり60秒間に5回まで
    let payment_routes = Router::new()
        .route("/api/v1/payments/intent", post(handlers::payments::create_payment_intent))
        .route("/api/v1/payments/confirm", post(handlers::payments::confirm_payment))
        .route("/api/v1/payments/refund", post(handlers::payments::create_refund))
        // ミドルウェア（外側から: BFF検証 → セッション署名検証 → 認証 → 決済レート制限）
        .layer(middleware::from_fn(payment_rate_limiter_middleware))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
        .layer(middleware::from_fn(session_signature_middleware))
        .layer(middleware::from_fn(bff_proxy_token_middleware));

    let auth_routes = Router::new()
        // プロファイル作成（Supabase Auth登録後にusersテーブルに追加）
        .route("/api/v1/auth/profile", post(handlers::auth::create_profile))
        // MFA（二要素認証）
        .route("/api/v1/auth/mfa/enroll", post(handlers::mfa::enroll))
        .route("/api/v1/auth/mfa/challenge", post(handlers::mfa::challenge))
        .route("/api/v1/auth/mfa/verify", post(handlers::mfa::verify))
        .route("/api/v1/auth/mfa/unenroll", post(handlers::mfa::unenroll))
        .route("/api/v1/auth/mfa/factors", get(handlers::mfa::list_factors))
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
        // ミドルウェア（外側から: BFF検証 → セッション署名検証 → 認証）
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
        .layer(middleware::from_fn(session_signature_middleware))
        .layer(middleware::from_fn(bff_proxy_token_middleware));

    // 管理者専用ルート
    let admin_routes = Router::new()
        // ユーザー管理
        .route("/api/v1/admin/users", get(handlers::users::list_users_admin))
        .route("/api/v1/admin/users/:id", patch(handlers::users::update_user_admin))
        // 注文管理
        .route("/api/v1/admin/orders", get(handlers::orders::list_orders_admin))
        .route("/api/v1/admin/orders/:id", get(handlers::orders::get_order_admin))
        .route("/api/v1/admin/orders/:id/status", patch(handlers::orders::update_order_status_admin))
        // 商品管理
        .route("/api/v1/admin/products", post(handlers::products::create_product))
        .route("/api/v1/admin/products/:id", put(handlers::products::update_product))
        .route("/api/v1/admin/products/:id", delete(handlers::products::delete_product))
        // バリアント管理
        .route("/api/v1/admin/products/:id/variants", post(handlers::products::create_variants))
        .route("/api/v1/admin/products/:id/variants/:variant_id", put(handlers::products::update_variant))
        .route("/api/v1/admin/products/:id/variants/:variant_id", delete(handlers::products::delete_variant))
        // お問い合わせ管理
        .route("/api/v1/admin/contacts", get(handlers::contact::list_contacts))
        .route("/api/v1/admin/contacts/:id", get(handlers::contact::get_contact))
        .route("/api/v1/admin/contacts/:id", put(handlers::contact::update_contact_status))
        // ミドルウェア（外側から: BFF検証 → セッション署名検証 → 認証 → 管理者権限）
        .layer(middleware::from_fn_with_state(state.clone(), admin_middleware))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
        .layer(middleware::from_fn(session_signature_middleware))
        .layer(middleware::from_fn(bff_proxy_token_middleware));

    Router::new()
        .merge(public_routes)
        .merge(contact_routes)
        .merge(payment_routes)
        .merge(auth_routes)
        .merge(admin_routes)
        .with_state(state)
}
