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

/// 決済エンドポイント専用レート制限ストア（より厳しい制限）
/// カードテスティング攻撃対策: 1IPあたり1分間に5回まで
static PAYMENT_RATE_LIMITER: std::sync::OnceLock<RateLimiterStore> = std::sync::OnceLock::new();

/// お問い合わせフォーム専用レート制限ストア
/// スパム対策: 1IPあたり1時間に5回まで
static CONTACT_RATE_LIMITER: std::sync::OnceLock<RateLimiterStore> = std::sync::OnceLock::new();

/// レート制限ストアを初期化
pub fn init_rate_limiter(window_seconds: u64, max_requests: u32) {
    let _ = RATE_LIMITER.set(RateLimiterStore::new(window_seconds, max_requests));

    // 決済エンドポイント専用: 60秒間に5リクエストまで（カードテスティング対策）
    let payment_window = std::env::var("PAYMENT_RATE_LIMIT_WINDOW_SECONDS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(60);
    let payment_max = std::env::var("PAYMENT_RATE_LIMIT_MAX_REQUESTS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(5);
    let _ = PAYMENT_RATE_LIMITER.set(RateLimiterStore::new(payment_window, payment_max));

    // お問い合わせフォーム専用: 1時間に5リクエストまで（スパム対策）
    let contact_window = std::env::var("CONTACT_RATE_LIMIT_WINDOW_SECONDS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3600); // 1時間
    let contact_max = std::env::var("CONTACT_RATE_LIMIT_MAX_REQUESTS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(5);
    let _ = CONTACT_RATE_LIMITER.set(RateLimiterStore::new(contact_window, contact_max));

    // 定期的なクリーンアップタスクを起動
    let store = RATE_LIMITER.get().unwrap().clone();
    let payment_store = PAYMENT_RATE_LIMITER.get().unwrap().clone();
    let contact_store = CONTACT_RATE_LIMITER.get().unwrap().clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            store.cleanup().await;
            payment_store.cleanup().await;
            contact_store.cleanup().await;
        }
    });
}

/// 信頼できるプロキシIPリストを取得
fn get_trusted_proxies() -> Vec<String> {
    std::env::var("TRUSTED_PROXY_IPS")
        .ok()
        .map(|s| s.split(',').map(|ip| ip.trim().to_string()).collect())
        .unwrap_or_else(|| {
            // デフォルトで信頼するIP（ローカル、Fly.io、Cloudflare等のプライベートレンジ）
            vec![
                "127.0.0.1".to_string(),
                "::1".to_string(),
                // Fly.ioのプライベートネットワーク
                "fdaa::".to_string(),
            ]
        })
}

/// クライアントIPを安全に取得
/// - 直接接続の場合: ソケットアドレスを使用
/// - 信頼できるプロキシ経由の場合のみ: X-Forwarded-Forを使用
fn get_client_ip(addr: &SocketAddr, headers: &axum::http::HeaderMap) -> String {
    let direct_ip = addr.ip().to_string();
    let trusted_proxies = get_trusted_proxies();

    // 直接接続が信頼できるプロキシからでない場合は、直接IPを使用
    let is_from_trusted_proxy = trusted_proxies.iter().any(|trusted| {
        if trusted.ends_with("::") {
            // IPv6プレフィックスマッチ
            direct_ip.starts_with(trusted)
        } else {
            direct_ip == *trusted
        }
    });

    if !is_from_trusted_proxy {
        // 信頼できないプロキシからのX-Forwarded-Forは無視
        return direct_ip;
    }

    // X-Forwarded-Forから最右端の非信頼IP（実際のクライアントIP）を取得
    // 形式: X-Forwarded-For: client, proxy1, proxy2
    // 攻撃者が偽装できるのは左側のみ、最右端は直前のプロキシが付与
    if let Some(xff) = headers.get("X-Forwarded-For").and_then(|h| h.to_str().ok()) {
        let ips: Vec<&str> = xff.split(',').map(|s| s.trim()).collect();

        // 右から走査して、最初の非信頼IPを返す
        for ip in ips.iter().rev() {
            let is_trusted = trusted_proxies.iter().any(|trusted| {
                if trusted.ends_with("::") {
                    ip.starts_with(trusted)
                } else {
                    *ip == trusted
                }
            });

            if !is_trusted && !ip.is_empty() {
                return ip.to_string();
            }
        }
    }

    // X-Real-IPもチェック（Cloudflare等が設定する）
    if let Some(real_ip) = headers.get("X-Real-IP").and_then(|h| h.to_str().ok()) {
        let real_ip = real_ip.trim();
        if !real_ip.is_empty() {
            return real_ip.to_string();
        }
    }

    // CF-Connecting-IP（Cloudflare専用）
    if let Some(cf_ip) = headers.get("CF-Connecting-IP").and_then(|h| h.to_str().ok()) {
        let cf_ip = cf_ip.trim();
        if !cf_ip.is_empty() {
            return cf_ip.to_string();
        }
    }

    direct_ip
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

    // クライアントIP取得（信頼できるプロキシ経由のみX-Forwarded-Forを使用）
    let client_ip = get_client_ip(&addr, request.headers());

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

/// 決済エンドポイント専用レート制限ミドルウェア
/// カードテスティング攻撃対策として、より厳しい制限を適用
pub async fn payment_rate_limiter_middleware(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request<Body>,
    next: Next,
) -> Response<Body> {
    let Some(store) = PAYMENT_RATE_LIMITER.get() else {
        // レート制限が初期化されていない場合はスキップ
        return next.run(request).await;
    };

    // クライアントIP取得（信頼できるプロキシ経由のみX-Forwarded-Forを使用）
    let client_ip = get_client_ip(&addr, request.headers());

    // 決済エンドポイント専用のキー（通常のレート制限と分離）
    let key = format!("payment:{}", client_ip);
    let result = store.check(&key).await;

    if !result.allowed {
        tracing::warn!(
            "Payment rate limit exceeded: ip={}, limit={}, window=60s",
            client_ip,
            result.limit
        );

        let body = serde_json::json!({
            "error": {
                "code": "PAYMENT_RATE_LIMITED",
                "message": "決済リクエストが多すぎます。しばらくしてから再試行してください。"
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

/// お問い合わせフォーム専用レート制限ミドルウェア
/// スパム対策として、1時間に5回までに制限
pub async fn contact_rate_limiter_middleware(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request<Body>,
    next: Next,
) -> Response<Body> {
    let Some(store) = CONTACT_RATE_LIMITER.get() else {
        // レート制限が初期化されていない場合はスキップ
        return next.run(request).await;
    };

    // クライアントIP取得
    let client_ip = get_client_ip(&addr, request.headers());

    // お問い合わせ専用のキー
    let key = format!("contact:{}", client_ip);
    let result = store.check(&key).await;

    if !result.allowed {
        tracing::warn!(
            "Contact rate limit exceeded: ip={}, limit={}, window=3600s",
            client_ip,
            result.limit
        );

        let body = serde_json::json!({
            "error": {
                "code": "CONTACT_RATE_LIMITED",
                "message": "お問い合わせの送信回数が上限に達しました。しばらくしてから再度お試しください。"
            }
        });

        return Response::builder()
            .status(StatusCode::TOO_MANY_REQUESTS)
            .header("Content-Type", "application/json")
            .header("X-RateLimit-Limit", result.limit.to_string())
            .header("X-RateLimit-Remaining", "0")
            .header("Retry-After", "3600")
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
