use serde::Serialize;
use worker::*;

#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
    version: String,
    timestamp: String,
}

pub async fn health_check(_req: Request, _env: Env) -> Result<Response> {
    let response = HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    Response::from_json(&response)
}

#[derive(Serialize)]
pub struct ReadyResponse {
    ready: bool,
    checks: ReadyChecks,
}

#[derive(Serialize)]
pub struct ReadyChecks {
    kv_cache: bool,
    rate_limit_kv: bool,
}

pub async fn readiness_check(_req: Request, env: Env) -> Result<Response> {
    let kv_cache = env.kv("CACHE").is_ok();
    let rate_limit_kv = env.kv("RATE_LIMIT").is_ok();

    let ready = kv_cache && rate_limit_kv;

    let response = ReadyResponse {
        ready,
        checks: ReadyChecks {
            kv_cache,
            rate_limit_kv,
        },
    };

    let status = if ready { 200 } else { 503 };
    Response::from_json(&response).map(|r| r.with_status(status))
}
