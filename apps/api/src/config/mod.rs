use serde::Deserialize;
use std::sync::Arc;
use crate::db::SupabaseClient;

/// アプリケーション設定
#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub jwt: JwtConfig,
    pub cors: CorsConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub port: u16,
    pub host: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub anon_key: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JwtConfig {
    pub secret: String,
    pub access_token_expiry: i64,  // 秒
    pub refresh_token_expiry: i64, // 秒
}

#[derive(Debug, Clone, Deserialize)]
pub struct CorsConfig {
    pub allowed_origins: Vec<String>,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            server: ServerConfig {
                port: std::env::var("PORT")
                    .unwrap_or_else(|_| "3001".to_string())
                    .parse()
                    .expect("PORT must be a number"),
                host: std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            },
            database: DatabaseConfig {
                url: std::env::var("SUPABASE_URL").expect("SUPABASE_URL must be set"),
                anon_key: std::env::var("SUPABASE_ANON_KEY").expect("SUPABASE_ANON_KEY must be set"),
            },
            jwt: JwtConfig {
                secret: std::env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
                access_token_expiry: std::env::var("JWT_ACCESS_EXPIRY")
                    .unwrap_or_else(|_| "3600".to_string())
                    .parse()
                    .unwrap_or(3600),
                refresh_token_expiry: std::env::var("JWT_REFRESH_EXPIRY")
                    .unwrap_or_else(|_| "2592000".to_string())
                    .parse()
                    .unwrap_or(2592000), // 30 days
            },
            cors: CorsConfig {
                allowed_origins: std::env::var("CORS_ORIGINS")
                    .unwrap_or_else(|_| "http://localhost:3000".to_string())
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .collect(),
            },
        }
    }
}

/// アプリケーション状態
#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub db: Arc<SupabaseClient>,
}

impl AppState {
    pub fn new(config: Config, db: SupabaseClient) -> Self {
        Self {
            config: Arc::new(config),
            db: Arc::new(db),
        }
    }
}
