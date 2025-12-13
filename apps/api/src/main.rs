use std::net::SocketAddr;
use std::net::IpAddr;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
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
use routes::create_router;

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
            axum::http::HeaderName::from_static("x-dev-bypass-token"),
        ]));

    // ルーターの構築
    let app = create_router(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    // サーバーの起動（HOST/PORT を尊重）
    let host: IpAddr = config.server.host.parse()?;
    let addr = SocketAddr::from((host, config.server.port));
    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
