use axum::{
    body::Body,
    extract::ConnectInfo,
    http::{Request, Response, StatusCode},
    middleware::Next,
};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

/// レート制限エントリ
#[derive(Debug, Clone)]
struct RateLimitEntry {
    count: u32,
    window_start: Instant,
}

/// インメモリレート制限ストア
#[derive(Debug, Clone)]
pub struct RateLimiterStore {
    entries: Arc<RwLock<HashMap<String, RateLimitEntry>>>,
    window_size: Duration,
    max_requests: u32,
}

impl RateLimiterStore {
    pub fn new(window_seconds: u64, max_requests: u32) -> Self {
        Self {
            entries: Arc::new(RwLock::new(HashMap::new())),
            window_size: Duration::from_secs(window_seconds),
            max_requests,
        }
    }

    /// クリーンアップ（古いエントリを削除）
    pub async fn cleanup(&self) {
        let now = Instant::now();
        let mut entries = self.entries.write().await;
        entries.retain(|_, entry| now.duration_since(entry.window_start) < self.window_size * 2);
    }

    /// レート制限チェック
    pub async fn check(&self, key: &str) -> RateLimitResult {
        let now = Instant::now();
        let mut entries = self.entries.write().await;

        let entry = entries.entry(key.to_string()).or_insert(RateLimitEntry {
            count: 0,
            window_start: now,
        });

        // ウィンドウが古い場合はリセット
        if now.duration_since(entry.window_start) >= self.window_size {
            entry.count = 0;
            entry.window_start = now;
        }

        entry.count += 1;
        let allowed = entry.count <= self.max_requests;
        let remaining = if allowed {
            self.max_requests - entry.count
        } else {
            0
        };

        let reset_at = entry.window_start + self.window_size;

        RateLimitResult {
            allowed,
            remaining,
            reset_at,
            limit: self.max_requests,
        }
    }
}

#[derive(Debug, Clone)]
pub struct RateLimitResult {
    pub allowed: bool,
    pub remaining: u32,
    pub reset_at: Instant,
    pub limit: u32,
}

/// グローバルレート制限ストア（API起動時に初期化）
static RATE_LIMITER: std::sync::OnceLock<RateLimiterStore> = std::sync::OnceLock::new();

/// レート制限ストアを初期化
pub fn init_rate_limiter(window_seconds: u64, max_requests: u32) {
    let _ = RATE_LIMITER.set(RateLimiterStore::new(window_seconds, max_requests));

    // 定期的なクリーンアップタスクを起動
    let store = RATE_LIMITER.get().unwrap().clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            store.cleanup().await;
        }
    });
}

/// レート制限ミドルウェア
pub async fn rate_limiter_middleware(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request<Body>,
    next: Next,
) -> Response<Body> {
    let Some(store) = RATE_LIMITER.get() else {
        // レート制限が初期化されていない場合はスキップ
        return next.run(request).await;
    };

    // クライアントIP取得（プロキシ経由の場合はX-Forwarded-Forを優先）
    let client_ip = request
        .headers()
        .get("X-Forwarded-For")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| addr.ip().to_string());

    let result = store.check(&client_ip).await;

    if !result.allowed {
        let body = serde_json::json!({
            "error": {
                "code": "RATE_LIMITED",
                "message": "リクエストが多すぎます。しばらくしてから再試行してください。"
            }
        });

        return Response::builder()
            .status(StatusCode::TOO_MANY_REQUESTS)
            .header("Content-Type", "application/json")
            .header("X-RateLimit-Limit", result.limit.to_string())
            .header("X-RateLimit-Remaining", "0")
            .header("Retry-After", "60")
            .body(Body::from(serde_json::to_string(&body).unwrap()))
            .unwrap();
    }

    let mut response = next.run(request).await;

    // レート制限ヘッダーを追加
    let headers = response.headers_mut();
    headers.insert(
        "X-RateLimit-Limit",
        result.limit.to_string().parse().unwrap(),
    );
    headers.insert(
        "X-RateLimit-Remaining",
        result.remaining.to_string().parse().unwrap(),
    );

    response
}
