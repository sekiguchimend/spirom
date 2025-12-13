use serde::Deserialize;
use std::sync::Arc;
use crate::db::SupabaseClient;
use anyhow::{anyhow, bail, Context};

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
    pub fn from_env() -> anyhow::Result<Self> {
        let jwt_secret = std::env::var("JWT_SECRET")
            .context("JWT_SECRET が設定されていません（例: `openssl rand -hex 32` で生成）")?;
        validate_jwt_secret(&jwt_secret)?;

        let env = std::env::var("ENVIRONMENT").unwrap_or_else(|_| "production".to_string());
        let is_dev = env == "development" || env == "local";
        validate_stripe_env(&env)?;

        Ok(Self {
            server: ServerConfig {
                port: std::env::var("PORT")
                    .unwrap_or_else(|_| "3001".to_string())
                    .parse()
                    .map_err(|e| anyhow!("PORT must be a number: {}", e))?,
                host: std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            },
            database: DatabaseConfig {
                url: std::env::var("SUPABASE_URL").context("SUPABASE_URL must be set")?,
                anon_key: std::env::var("SUPABASE_ANON_KEY").context("SUPABASE_ANON_KEY must be set")?,
            },
            jwt: JwtConfig {
                secret: jwt_secret,
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
                    .ok()
                    .or_else(|| {
                        if is_dev {
                            Some("http://localhost:3000".to_string())
                        } else {
                            None
                        }
                    })
                    .ok_or_else(|| anyhow!("CORS_ORIGINS must be set in production"))?
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect(),
            },
        })
    }
}

fn validate_stripe_env(environment: &str) -> anyhow::Result<()> {
    // Stripeは決済系エンドポイントで必須。productionではテストキー混入を防ぐ。
    let is_prod = environment == "production";

    if let Ok(sk) = std::env::var("STRIPE_SECRET_KEY") {
        if is_prod && sk.starts_with("sk_test_") {
            bail!("本番環境でSTRIPE_SECRET_KEYにsk_test_が設定されています。sk_live_を設定してください。");
        }
    } else if is_prod {
        bail!("本番環境ではSTRIPE_SECRET_KEYが必須です。");
    }

    // Webhook secretはローテーション対応（CSV）
    let wh_single = std::env::var("STRIPE_WEBHOOK_SECRET").ok().unwrap_or_default();
    let wh_multi = std::env::var("STRIPE_WEBHOOK_SECRETS").ok().unwrap_or_default();
    let has_any = !wh_single.trim().is_empty() || !wh_multi.trim().is_empty();
    if is_prod && !has_any {
        bail!("本番環境ではSTRIPE_WEBHOOK_SECRET または STRIPE_WEBHOOK_SECRETS が必須です。");
    }

    Ok(())
}

fn validate_jwt_secret(secret: &str) -> anyhow::Result<()> {
    // ローカル開発でどうしても弱い値を使う場合は明示的に許可する（デフォルトは拒否）
    let env = std::env::var("ENVIRONMENT").unwrap_or_else(|_| "production".to_string());
    let is_dev = env == "development" || env == "local";
    let allow_weak = std::env::var("ALLOW_WEAK_JWT_SECRET")
        .ok()
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    if is_dev && allow_weak {
        return Ok(());
    }

    let s = secret.trim();
    let lower = s.to_ascii_lowercase();

    // よくあるダメ値・推測可能値・短すぎる値は拒否する
    let too_short = s.chars().count() < 32;
    let looks_default = lower == "change-me"
        || lower == "changeme"
        || lower.contains("local-dev-jwt-secret")
        || lower.contains("jwt-secret-spirom")
        || lower.contains("spirom-2024");

    if s.is_empty() || too_short || looks_default {
        bail!(
            "JWT_SECRET が弱すぎます。32文字以上のランダムな値に変更してください（例: `openssl rand -hex 32`）。"
        );
    }

    Ok(())
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
