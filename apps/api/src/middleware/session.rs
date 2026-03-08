use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

/// セッションID署名検証ミドルウェア
/// Next.jsプロキシから付与されたセッションID署名を検証し、
/// 直接API叩きによるセッションID偽装を防ぐ
pub async fn session_signature_middleware(
    request: Request<Body>,
    next: Next,
) -> Result<Response, (StatusCode, &'static str)> {
    // セッションIDと署名を取得
    let session_id = request
        .headers()
        .get("X-Session-ID")
        .and_then(|h| h.to_str().ok());

    let session_signature = request
        .headers()
        .get("X-Session-Signature")
        .and_then(|h| h.to_str().ok());

    // セッションIDがある場合のみ署名を検証
    if let Some(session_id) = session_id {
        // 署名がない場合は拒否
        let signature = session_signature.ok_or((
            StatusCode::FORBIDDEN,
            "Session signature is required",
        ))?;

        // 署名を検証
        if !verify_session_signature(session_id, signature) {
            tracing::warn!(
                "Invalid session signature: session_id={}, signature={}",
                &session_id[..session_id.len().min(10)],
                &signature[..signature.len().min(10)]
            );
            return Err((StatusCode::FORBIDDEN, "Invalid session signature"));
        }
    }

    Ok(next.run(request).await)
}

/// セッションID署名を検証
fn verify_session_signature(session_id: &str, signature: &str) -> bool {
    let secret = get_session_secret();
    let env = std::env::var("ENVIRONMENT").unwrap_or_else(|_| "production".to_string());

    if secret.is_empty() {
        // 本番環境では必ずSESSION_SECRETが必要
        if env == "production" {
            tracing::error!("SESSION_SECRET is not set in production - rejecting request");
            return false;
        }
        // 開発環境でのみ署名検証をスキップ（警告付き）
        tracing::warn!("SESSION_SECRET is not set in development - skipping signature verification");
        return true;
    }

    // HMAC-SHA256で署名を計算
    let mut mac = match HmacSha256::new_from_slice(secret.as_bytes()) {
        Ok(mac) => mac,
        Err(_) => {
            tracing::error!("Failed to create HMAC instance");
            return false;
        }
    };

    mac.update(session_id.as_bytes());
    let expected_signature = hex::encode(mac.finalize().into_bytes());

    // 定数時間比較（タイミング攻撃対策）
    constant_time_compare(&expected_signature, signature)
}

/// SESSION_SECRETを取得（JWT_SECRETにフォールバック）
fn get_session_secret() -> String {
    std::env::var("SESSION_SECRET")
        .or_else(|_| std::env::var("JWT_SECRET"))
        .unwrap_or_default()
}

/// 定数時間で文字列を比較（タイミング攻撃対策）
fn constant_time_compare(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }

    let mut result = 0u8;
    for (x, y) in a.bytes().zip(b.bytes()) {
        result |= x ^ y;
    }
    result == 0
}

/// BFFプロキシトークン検証ミドルウェア
/// 本番環境では、Next.jsプロキシ経由のリクエストのみを許可
pub async fn bff_proxy_token_middleware(
    request: Request<Body>,
    next: Next,
) -> Result<Response, (StatusCode, &'static str)> {
    let env = std::env::var("ENVIRONMENT").unwrap_or_else(|_| "production".to_string());
    let is_prod = env == "production";

    // 開発環境では検証をスキップ
    if !is_prod {
        return Ok(next.run(request).await);
    }

    let expected_token = std::env::var("BFF_PROXY_TOKEN").unwrap_or_default();

    // 本番環境でトークンが設定されていない場合は拒否（セキュリティ強化）
    if expected_token.is_empty() {
        tracing::error!("BFF_PROXY_TOKEN is not set in production - rejecting request");
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "Server configuration error"));
    }

    let provided_token = request
        .headers()
        .get("X-BFF-Proxy-Token")
        .and_then(|h| h.to_str().ok())
        .unwrap_or_default();

    if !constant_time_compare(&expected_token, provided_token) {
        tracing::warn!("Invalid or missing BFF proxy token");
        return Err((StatusCode::FORBIDDEN, "Access denied"));
    }

    Ok(next.run(request).await)
}
