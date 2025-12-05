use serde::Serialize;
use worker::*;

#[derive(Debug, Clone, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

#[derive(Debug)]
pub enum BffError {
    NotFound(String),
    BadRequest(String),
    Unauthorized(String),
    RateLimited,
    InternalError(String),
    UpstreamError(String),
    CacheError(String),
}

impl BffError {
    pub fn to_response(&self) -> Result<Response> {
        let (status, code, message) = match self {
            BffError::NotFound(msg) => (404, "NOT_FOUND", msg.clone()),
            BffError::BadRequest(msg) => (400, "BAD_REQUEST", msg.clone()),
            BffError::Unauthorized(msg) => (401, "UNAUTHORIZED", msg.clone()),
            BffError::RateLimited => (429, "RATE_LIMITED", "Too many requests".to_string()),
            BffError::InternalError(msg) => (500, "INTERNAL_ERROR", msg.clone()),
            BffError::UpstreamError(msg) => (502, "UPSTREAM_ERROR", msg.clone()),
            BffError::CacheError(msg) => (500, "CACHE_ERROR", msg.clone()),
        };

        let error_response = ErrorResponse {
            error: message,
            code: code.to_string(),
            details: None,
        };

        let json = serde_json::to_string(&error_response)
            .map_err(|e| worker::Error::from(e.to_string()))?;

        Response::from_json(&error_response).map(|r| r.with_status(status))
    }
}

impl From<worker::Error> for BffError {
    fn from(e: worker::Error) -> Self {
        BffError::InternalError(e.to_string())
    }
}

impl From<serde_json::Error> for BffError {
    fn from(e: serde_json::Error) -> Self {
        BffError::InternalError(e.to_string())
    }
}

impl From<url::ParseError> for BffError {
    fn from(e: url::ParseError) -> Self {
        BffError::BadRequest(e.to_string())
    }
}
