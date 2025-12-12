use worker::*;
use crate::error::BffError;
use crate::services::ApiClient;
use serde::{Deserialize, Serialize};

pub struct OrdersHandler {
    api_client: ApiClient,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderSummary {
    pub id: String,
    pub order_number: String,
    pub status: String,
    pub total: i64,
    pub currency: String,
    pub item_count: i32,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shipped_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delivered_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedOrdersResponse {
    pub data: Vec<OrderSummary>,
    pub meta: PaginationMeta,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginationMeta {
    pub page: i32,
    pub per_page: i32,
    pub total: i64,
    pub total_pages: i32,
}

impl OrdersHandler {
    pub fn new(api_client: ApiClient) -> Self {
        Self { api_client }
    }

    /// Get orders list (requires authentication)
    pub async fn list(&self, req: Request) -> std::result::Result<Response, BffError> {
        // Extract authorization header
        let token = req.headers()
            .get("Authorization")
            .map_err(BffError::from)?
            .ok_or_else(|| BffError::Unauthorized("Authorization header required".to_string()))?;

        // Remove "Bearer " prefix if present
        let token = token.strip_prefix("Bearer ").unwrap_or(&token);

        let orders: PaginatedOrdersResponse = self.api_client
            .get_with_auth("/api/v1/orders", token)
            .await?;

        Response::from_json(&orders).map_err(BffError::from)
    }

    /// Get order detail (requires authentication)
    pub async fn detail(&self, req: Request, order_id: &str) -> std::result::Result<Response, BffError> {
        if order_id.is_empty() || order_id.len() > 50 {
            return Err(BffError::BadRequest("Invalid order ID".to_string()));
        }

        // Extract authorization header
        let token = req.headers()
            .get("Authorization")
            .map_err(BffError::from)?
            .ok_or_else(|| BffError::Unauthorized("Authorization header required".to_string()))?;

        // Remove "Bearer " prefix if present
        let token = token.strip_prefix("Bearer ").unwrap_or(&token);

        let path = format!("/api/v1/orders/{}", order_id);
        let order: serde_json::Value = self.api_client
            .get_with_auth(&path, token)
            .await?;

        Response::from_json(&order).map_err(BffError::from)
    }
}

