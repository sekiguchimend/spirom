use axum::{
    body::Body,
    extract::State,
    http::{header, Request, StatusCode},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};

use crate::config::{AppState, JwtConfig};
use crate::db::repositories::TokenBlacklistRepository;
use crate::error::AppError;
use crate::models::{AuthenticatedUser, Claims, UserRole};

/// JWT認証ミドルウェア（Supabase Auth対応）
pub async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let token = extract_token(&request)?;
    request.extensions_mut().insert(token.clone());

    let claims = validate_supabase_token(&token, &state.config.jwt)?;

    let user: AuthenticatedUser = claims.clone().try_into()
        .map_err(|e: &str| AppError::Unauthorized(e.to_string()))?;

    // トークンブラックリストをチェック（ログアウト済みトークンを拒否）
    let blacklist_repo = TokenBlacklistRepository::new(state.db.service());

    // 個別トークンのブラックリストチェック（jtiがある場合）
    if let Some(ref jti) = claims.jti {
        if blacklist_repo.is_blacklisted(jti).await.unwrap_or(false) {
            return Err(AppError::Unauthorized("トークンは無効化されています".to_string()));
        }
    }

    // ユーザー全体のブラックリストチェック（パスワード変更時等）
    if blacklist_repo.is_user_blacklisted(user.id).await.unwrap_or(false) {
        return Err(AppError::Unauthorized("再ログインが必要です".to_string()));
    }

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
        if let Ok(claims) = validate_supabase_token(&token, &state.config.jwt) {
            if let Ok(user) = AuthenticatedUser::try_from(claims.clone()) {
                // ブラックリストチェック（オプショナルなのでエラーは無視して認証なし扱い）
                let blacklist_repo = TokenBlacklistRepository::new(state.db.service());
                let is_blacklisted = claims.jti.as_ref()
                    .map(|jti| blacklist_repo.is_blacklisted(jti))
                    .map(|f| futures::executor::block_on(f).unwrap_or(false))
                    .unwrap_or(false);
                let is_user_blacklisted = futures::executor::block_on(
                    blacklist_repo.is_user_blacklisted(user.id)
                ).unwrap_or(false);

                if !is_blacklisted && !is_user_blacklisted {
                    request.extensions_mut().insert(token);
                    request.extensions_mut().insert(user);
                }
            }
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

    let claims = validate_supabase_token(&token, &state.config.jwt)?;

    let user: AuthenticatedUser = claims.clone().try_into()
        .map_err(|e: &str| AppError::Unauthorized(e.to_string()))?;

    // トークンブラックリストをチェック
    let blacklist_repo = TokenBlacklistRepository::new(state.db.service());

    if let Some(ref jti) = claims.jti {
        if blacklist_repo.is_blacklisted(jti).await.unwrap_or(false) {
            return Err(AppError::Unauthorized("トークンは無効化されています".to_string()));
        }
    }

    if blacklist_repo.is_user_blacklisted(user.id).await.unwrap_or(false) {
        return Err(AppError::Unauthorized("再ログインが必要です".to_string()));
    }

    if user.role != UserRole::Admin {
        return Err(AppError::Forbidden("管理者権限が必要です".to_string()));
    }

    request.extensions_mut().insert(token);
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

/// Supabase Auth JWTトークンの検証
fn validate_supabase_token(token: &str, jwt_config: &JwtConfig) -> Result<Claims, AppError> {
    let decoding_key = DecodingKey::from_secret(jwt_config.secret.as_bytes());

    // Supabase AuthはHS256を使用
    let mut validation = Validation::new(Algorithm::HS256);

    // audience検証を有効化（別プロジェクトのJWTを拒否）
    validation.set_audience(&[&jwt_config.audience]);
    validation.validate_aud = true;

    // issuer検証を有効化（自プロジェクトのJWTのみ許可）
    validation.set_issuer(&[&jwt_config.issuer]);
    validation.validate_exp = true;

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
