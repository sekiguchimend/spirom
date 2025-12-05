use axum::{
    body::Body,
    extract::State,
    http::{header, Request, StatusCode},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey, Validation};

use crate::config::AppState;
use crate::error::AppError;
use crate::models::{AuthenticatedUser, Claims, UserRole};

/// JWT認証ミドルウェア
pub async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let token = extract_token(&request)?;

    let claims = validate_token(&token, &state.config.jwt.secret)?;

    // 認証情報をリクエストエクステンションに追加
    let user = AuthenticatedUser::from(claims);
    request.extensions_mut().insert(user);

    Ok(next.run(request).await)
}

/// オプショナル認証ミドルウェア（認証なしでもアクセス可能）
pub async fn optional_auth_middleware(
    State(state): State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Response {
    if let Ok(token) = extract_token(&request) {
        if let Ok(claims) = validate_token(&token, &state.config.jwt.secret) {
            let user = AuthenticatedUser::from(claims);
            request.extensions_mut().insert(user);
        }
    }

    next.run(request).await
}

/// 管理者認証ミドルウェア
pub async fn admin_middleware(
    State(state): State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let token = extract_token(&request)?;

    let claims = validate_token(&token, &state.config.jwt.secret)?;

    if claims.role != UserRole::Admin {
        return Err(AppError::Forbidden("管理者権限が必要です".to_string()));
    }

    let user = AuthenticatedUser::from(claims);
    request.extensions_mut().insert(user);

    Ok(next.run(request).await)
}

/// リクエストヘッダーからトークンを抽出
fn extract_token(request: &Request<Body>) -> Result<String, AppError> {
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("認証ヘッダーがありません".to_string()))?;

    if !auth_header.starts_with("Bearer ") {
        return Err(AppError::Unauthorized("無効な認証形式です".to_string()));
    }

    Ok(auth_header[7..].to_string())
}

/// JWTトークンの検証
fn validate_token(token: &str, secret: &str) -> Result<Claims, AppError> {
    let decoding_key = DecodingKey::from_secret(secret.as_bytes());
    let validation = Validation::default();

    let token_data = decode::<Claims>(token, &decoding_key, &validation)
        .map_err(|e| {
            tracing::debug!("Token validation failed: {}", e);
            AppError::Unauthorized("トークンが無効です".to_string())
        })?;

    Ok(token_data.claims)
}

/// セッションID抽出
pub fn extract_session_id(request: &Request<Body>) -> Option<String> {
    request
        .headers()
        .get("X-Session-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
}

/// セッションID生成
pub fn generate_session_id() -> String {
    format!("sess_{}", uuid::Uuid::new_v4().to_string().replace("-", ""))
}
