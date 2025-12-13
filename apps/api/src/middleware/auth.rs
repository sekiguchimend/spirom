use axum::{
    body::Body,
    extract::State,
    http::{header, Request, StatusCode},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey, Validation};

use crate::config::AppState;
use crate::db::repositories::TokenBlacklistRepository;
use crate::error::AppError;
use crate::models::{AuthenticatedUser, Claims, UserRole};

/// JWT認証ミドルウェア
pub async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let env = std::env::var("ENVIRONMENT").unwrap_or_else(|_| "production".to_string());
    let is_dev = env == "development" || env == "local";

    // 開発環境:
    // - Authorization Bearer があれば通常通り検証する
    // - 認証バイパスは「明示的なDEV_AUTH_BYPASS_TOKENが設定され、ヘッダ一致した場合のみ」許可する
    // - 本番/ステージング環境では絶対にバイパスを許可しない
    if is_dev {
        if let Ok(token) = extract_token(&request) {
            if let Ok(claims) = validate_token(&token, &state.config.jwt.secret) {
                // ブラックリストチェック
                if is_token_blacklisted(&state, &claims).await {
                    return Err(AppError::Unauthorized("トークンは無効化されています".to_string()));
                }
                request.extensions_mut().insert(token);
                let user = AuthenticatedUser::from(claims);
                request.extensions_mut().insert(user);
                return Ok(next.run(request).await);
            }
        }

        // 二重チェック: 環境変数が"development"または"local"の場合のみバイパスを検討
        // これにより、本番でDEV_AUTH_BYPASS_TOKENが誤設定されても無効
        let allow_bypass = std::env::var("ALLOW_DEV_AUTH_BYPASS")
            .ok()
            .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(false);

        if allow_bypass {
            let bypass_secret = std::env::var("DEV_AUTH_BYPASS_TOKEN").ok();
            let provided = request
                .headers()
                .get("X-Dev-Bypass-Token")
                .and_then(|h| h.to_str().ok())
                .map(|s| s.to_string());

            if let (Some(expected), Some(actual)) = (bypass_secret, provided) {
                // 最低32文字のトークンを要求（弱いトークン対策）
                if expected.len() >= 32 && expected == actual {
                    tracing::warn!("DEV AUTH BYPASS USED - this should never happen in production!");
                    let dev_user = AuthenticatedUser {
                        id: uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
                        email: "dev@spirom.com".to_string(),
                        role: UserRole::Admin,
                    };
                    request.extensions_mut().insert("dev-bypass".to_string());
                    request.extensions_mut().insert(dev_user);
                    return Ok(next.run(request).await);
                }
            }
        }

        return Err(AppError::Unauthorized(
            "開発環境でも認証が必要です（ALLOW_DEV_AUTH_BYPASS=1 と DEV_AUTH_BYPASS_TOKEN を設定して明示的に許可できます）"
                .to_string(),
        ));
    }

    // 本番/ステージング: Authorization Bearer を必須にして検証
    let token = extract_token(&request)?;
    request.extensions_mut().insert(token.clone());

    let claims = validate_token(&token, &state.config.jwt.secret)?;

    // ブラックリストチェック
    if is_token_blacklisted(&state, &claims).await {
        return Err(AppError::Unauthorized("トークンは無効化されています".to_string()));
    }

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
            // ブラックリストチェック（オプショナル認証では無視）
            if !is_token_blacklisted(&state, &claims).await {
                let user = AuthenticatedUser::from(claims);
                request.extensions_mut().insert(user);
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

    let claims = validate_token(&token, &state.config.jwt.secret)?;

    // ブラックリストチェック
    if is_token_blacklisted(&state, &claims).await {
        return Err(AppError::Unauthorized("トークンは無効化されています".to_string()));
    }

    if claims.role != UserRole::Admin {
        return Err(AppError::Forbidden("管理者権限が必要です".to_string()));
    }

    let user = AuthenticatedUser::from(claims);
    request.extensions_mut().insert(user);

    Ok(next.run(request).await)
}

/// トークンがブラックリストに登録されているか確認
async fn is_token_blacklisted(state: &AppState, claims: &Claims) -> bool {
    // ブラックリストチェックを無効化するオプション（パフォーマンス重視の場合）
    let skip_blacklist = std::env::var("SKIP_TOKEN_BLACKLIST_CHECK")
        .ok()
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    if skip_blacklist {
        return false;
    }

    let blacklist_repo = TokenBlacklistRepository::new(state.db.service());

    // 個別トークンのブラックリストチェック
    if let Ok(is_blacklisted) = blacklist_repo.is_blacklisted(&claims.jti).await {
        if is_blacklisted {
            return true;
        }
    }

    // ユーザー全体のブラックリストチェック（パスワード変更時等）
    if let Ok(is_user_blacklisted) = blacklist_repo.is_user_blacklisted(claims.sub).await {
        if is_user_blacklisted {
            // トークンの発行時刻がブラックリスト登録より前なら無効
            // （新しいトークンは有効にするため、この実装では単純化）
            return true;
        }
    }

    false
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
