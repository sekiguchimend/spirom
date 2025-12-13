use axum::{
    body::Body,
    http::{Request, Response},
    middleware::Next,
};

/// セキュリティヘッダーを追加するミドルウェア
pub async fn security_headers_middleware(
    request: Request<Body>,
    next: Next,
) -> Response<Body> {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();

    // XSS Protection
    headers.insert(
        "X-Content-Type-Options",
        "nosniff".parse().unwrap(),
    );

    // Clickjacking Protection
    headers.insert(
        "X-Frame-Options",
        "DENY".parse().unwrap(),
    );

    // XSS Filter（レガシーブラウザ向け）
    headers.insert(
        "X-XSS-Protection",
        "1; mode=block".parse().unwrap(),
    );

    // Referrer Policy
    headers.insert(
        "Referrer-Policy",
        "strict-origin-when-cross-origin".parse().unwrap(),
    );

    // Content Security Policy for API
    headers.insert(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'".parse().unwrap(),
    );

    // Permissions Policy
    headers.insert(
        "Permissions-Policy",
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()".parse().unwrap(),
    );

    // Cache Control for API responses
    if !headers.contains_key("Cache-Control") {
        headers.insert(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, proxy-revalidate".parse().unwrap(),
        );
    }

    // Pragma for HTTP/1.0 compatibility
    headers.insert(
        "Pragma",
        "no-cache".parse().unwrap(),
    );

    response
}

/// HSTS（HTTP Strict Transport Security）ヘッダーを追加
/// 本番環境のみで使用すること
pub async fn hsts_middleware(
    request: Request<Body>,
    next: Next,
) -> Response<Body> {
    let mut response = next.run(request).await;

    // 本番環境でのみHSTSを有効化
    let env = std::env::var("ENVIRONMENT").unwrap_or_else(|_| "production".to_string());
    if env == "production" {
        response.headers_mut().insert(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload".parse().unwrap(),
        );
    }

    response
}
