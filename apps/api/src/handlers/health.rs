use axum::{extract::State, Json};
use serde::Serialize;

use crate::config::AppState;
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
    pub rpc_status: RpcStatus,
}

#[derive(Serialize)]
pub struct RpcStatus {
    pub reserve_stock_bulk: String,
    pub release_stock_bulk: String,
    pub record_stripe_event: String,
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

/// Readinessチェック（DB接続・RPC存在確認含む）
pub async fn readiness(State(state): State<AppState>) -> Result<Json<ReadinessResponse>> {
    let db = state.db.service();

    // DB接続チェック
    let db_status = match state.db.health_check().await {
        Ok(_) => "connected".to_string(),
        Err(_) => "disconnected".to_string(),
    };

    // RPC存在チェック（空の引数で呼び出して、PGRST202エラーかどうかで判定）
    let reserve_stock_status = check_rpc_exists(&db, "reserve_stock_bulk").await;
    let release_stock_status = check_rpc_exists(&db, "release_stock_bulk").await;
    let record_stripe_event_status = check_rpc_exists(&db, "record_stripe_event").await;

    let rpc_status = RpcStatus {
        reserve_stock_bulk: reserve_stock_status.clone(),
        release_stock_bulk: release_stock_status.clone(),
        record_stripe_event: record_stripe_event_status.clone(),
    };

    // 全てのRPCが利用可能かチェック
    let all_rpcs_available = reserve_stock_status == "available"
        && release_stock_status == "available"
        && record_stripe_event_status == "available";

    let overall_status = if db_status == "connected" && all_rpcs_available {
        "ready"
    } else if db_status == "connected" {
        "degraded" // DBは接続できるがRPCが不足
    } else {
        "not_ready"
    };

    // RPCが不足している場合は警告ログ
    if !all_rpcs_available {
        tracing::warn!(
            "RPC health check failed: reserve_stock={}, release_stock={}, record_stripe_event={}",
            reserve_stock_status,
            release_stock_status,
            record_stripe_event_status
        );
    }

    Ok(Json(ReadinessResponse {
        status: overall_status.to_string(),
        database: db_status,
        rpc_status,
    }))
}

/// RPCの存在確認
async fn check_rpc_exists(db: &crate::db::AuthenticatedClient, rpc_name: &str) -> String {
    // ダミーパラメータでRPCを呼び出し、エラーの種類で判定
    let result: std::result::Result<bool, _> = db
        .rpc(rpc_name, &serde_json::json!({}))
        .await;

    match result {
        Ok(_) => "available".to_string(),
        Err(e) => {
            let err_str = e.to_string();
            if err_str.contains("PGRST202") {
                // RPC not found
                "not_found".to_string()
            } else if err_str.contains("PGRST204") || err_str.contains("argument") {
                // 引数エラー = RPCは存在する
                "available".to_string()
            } else {
                // その他のエラー（接続エラー等）
                "error".to_string()
            }
        }
    }
}
