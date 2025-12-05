use axum::{extract::State, Json};
use serde::Serialize;

use crate::config::AppState;
use crate::db::health_check as db_health_check;
use crate::error::Result;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
}

#[derive(Serialize)]
pub struct ReadinessResponse {
    pub status: String,
    pub database: String,
}

/// ヘルスチェック
pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

/// Livenessチェック
pub async fn liveness() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "alive".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

/// Readinessチェック（DB接続含む）
pub async fn readiness(State(state): State<AppState>) -> Result<Json<ReadinessResponse>> {
    let db_status = match db_health_check(&state.db).await {
        Ok(_) => "connected".to_string(),
        Err(_) => "disconnected".to_string(),
    };

    Ok(Json(ReadinessResponse {
        status: if db_status == "connected" { "ready" } else { "not_ready" }.to_string(),
        database: db_status,
    }))
}
