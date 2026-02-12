use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

/// アプリケーションエラー
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Too many requests: {0}")]
    TooManyRequests(String),

    #[error("Internal server error: {0}")]
    Internal(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("External service error: {0}")]
    ExternalService(String),
}

/// エラーコード
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    ValidationError,
    Unauthorized,
    Forbidden,
    NotFound,
    Conflict,
    BadRequest,
    TooManyRequests,
    InternalError,
    DatabaseError,
    ExternalServiceError,
}

/// エラー詳細
#[derive(Debug, Clone, Serialize)]
pub struct ErrorDetail {
    pub field: String,
    pub message: String,
}

/// エラーレスポンス
#[derive(Debug, Clone, Serialize)]
pub struct ErrorResponse {
    pub error: ErrorBody,
}

#[derive(Debug, Clone, Serialize)]
pub struct ErrorBody {
    pub code: ErrorCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Vec<ErrorDetail>>,
}

impl ErrorResponse {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            error: ErrorBody {
                code,
                message: message.into(),
                details: None,
            },
        }
    }

    pub fn with_details(mut self, details: Vec<ErrorDetail>) -> Self {
        self.error.details = Some(details);
        self
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        // 詳細エラーは「明示的に」API_DEBUG_ERRORS=1 のときのみ返す
        // （ENVIRONMENT=local/development でもデフォルトは秘匿して漏えいリスクを下げる）
        let debug_errors = std::env::var("API_DEBUG_ERRORS")
            .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(false);

        let (status, error_response) = match &self {
            AppError::Validation(msg) => (
                StatusCode::BAD_REQUEST,
                ErrorResponse::new(ErrorCode::ValidationError, msg),
            ),
            AppError::Unauthorized(msg) => (
                StatusCode::UNAUTHORIZED,
                ErrorResponse::new(ErrorCode::Unauthorized, msg),
            ),
            AppError::Forbidden(msg) => (
                StatusCode::FORBIDDEN,
                ErrorResponse::new(ErrorCode::Forbidden, msg),
            ),
            AppError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                ErrorResponse::new(ErrorCode::NotFound, msg),
            ),
            AppError::Conflict(msg) => (
                StatusCode::CONFLICT,
                ErrorResponse::new(ErrorCode::Conflict, msg),
            ),
            AppError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                ErrorResponse::new(ErrorCode::BadRequest, msg),
            ),
            AppError::TooManyRequests(msg) => (
                StatusCode::TOO_MANY_REQUESTS,
                ErrorResponse::new(ErrorCode::TooManyRequests, msg),
            ),
            AppError::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ErrorResponse::new(ErrorCode::InternalError, "内部エラーが発生しました"),
                )
            }
            AppError::Database(msg) => {
                tracing::error!("Database error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    if debug_errors {
                        ErrorResponse::new(ErrorCode::DatabaseError, format!("データベースエラー: {}", msg))
                    } else {
                        ErrorResponse::new(
                            ErrorCode::DatabaseError,
                            "データベースエラーが発生しました（API_DEBUG_ERRORS=1 で詳細を表示できます）"
                        )
                    },
                )
            }
            AppError::ExternalService(msg) => {
                tracing::error!("External service error: {}", msg);
                (
                    StatusCode::BAD_GATEWAY,
                    ErrorResponse::new(ErrorCode::ExternalServiceError, "外部サービスエラーが発生しました"),
                )
            }
        };

        (status, Json(error_response)).into_response()
    }
}

// バリデーションエラーの変換
impl From<validator::ValidationErrors> for AppError {
    fn from(errors: validator::ValidationErrors) -> Self {
        let messages: Vec<String> = errors
            .field_errors()
            .iter()
            .flat_map(|(field, errs)| {
                errs.iter().map(move |e| {
                    format!(
                        "{}: {}",
                        field,
                        e.message.as_ref().map(|m| m.to_string()).unwrap_or_else(|| "無効な値です".to_string())
                    )
                })
            })
            .collect();
        AppError::Validation(messages.join(", "))
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
