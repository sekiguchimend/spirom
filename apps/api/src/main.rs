use axum::middleware as axum_middleware;
use std::net::SocketAddr;
use std::net::IpAddr;
use std::time::Duration;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod error;
mod handlers;
mod middleware;
mod models;
mod routes;
mod services;

use config::{AppState, Config};
use db::SupabaseClient;
use middleware::{security_headers_middleware, hsts_middleware, init_rate_limiter, rate_limiter_middleware};
use routes::create_router;
use services::payment::spawn_payment_reconciler;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 環境変数の読み込み
    dotenvy::dotenv().ok();

    // トレーシングの初期化
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "spirom_api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 設定読み込み
    let config = Config::from_env()?;
    tracing::info!("Configuration loaded");

    // Supabaseクライアント作成
    tracing::info!("Connecting to Supabase at {}", config.database.url);
    let supabase = SupabaseClient::new(&config.database.url, &config.database.anon_key)?;

    // ヘルスチェック
    match supabase.health_check().await {
        Ok(true) => tracing::info!("Connected to Supabase"),
        Ok(false) => tracing::warn!("Supabase health check returned false"),
        Err(e) => tracing::warn!("Supabase health check failed: {}", e),
    }

    // アプリケーション状態
    let state = AppState::new(config.clone(), supabase);
    // Webhook不達/遅延のリカバリ（バックグラウンド回収）
    spawn_payment_reconciler(state.clone());

    // CORSの設定（許可リスト方式）
    let allowed_origins: Vec<axum::http::HeaderValue> = config
        .cors
        .allowed_origins
        .iter()
        .map(|s| s.parse::<axum::http::HeaderValue>())
        .collect::<Result<Vec<_>, _>>()?;

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(allowed_origins))
        .allow_methods(AllowMethods::list([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ]))
        .allow_headers(AllowHeaders::list([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
            axum::http::header::ACCEPT,
            axum::http::HeaderName::from_static("x-session-id"),
            axum::http::HeaderName::from_static("x-session-signature"),
            axum::http::HeaderName::from_static("x-dev-bypass-token"),
        ]))
        .allow_credentials(true);

    // DoS対策設定
    let request_body_limit = std::env::var("REQUEST_BODY_LIMIT_BYTES")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(1024 * 1024); // デフォルト1MB

    let request_timeout_seconds = std::env::var("REQUEST_TIMEOUT_SECONDS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(30); // デフォルト30秒

    // レート制限の初期化（デフォルト: 60秒間に200リクエスト）
    let rate_limit_window = std::env::var("RATE_LIMIT_WINDOW_SECONDS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(60);
    let rate_limit_max = std::env::var("RATE_LIMIT_MAX_REQUESTS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(200);
    init_rate_limiter(rate_limit_window, rate_limit_max);
    tracing::info!("Rate limiter initialized: {} requests per {} seconds", rate_limit_max, rate_limit_window);

    // ルーターの構築
    // 注意: layerは逆順に適用される（最後に追加したものが最初に実行される）
    let app = create_router(state)
        .layer(axum_middleware::from_fn(security_headers_middleware))
        .layer(axum_middleware::from_fn(hsts_middleware))
        .layer(axum_middleware::from_fn(rate_limiter_middleware))
        .layer(cors)
        // リクエストボディサイズ制限（メモリ枯渇対策）
        .layer(RequestBodyLimitLayer::new(request_body_limit))
        // リクエストタイムアウト（SlowLoris対策）
        .layer(TimeoutLayer::new(Duration::from_secs(request_timeout_seconds)))
        .layer(TraceLayer::new_for_http());

    // サーバーの起動（HOST/PORT を尊重）
    let host: IpAddr = config.server.host.parse()?;
    let addr = SocketAddr::from((host, config.server.port));
    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}
