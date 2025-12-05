use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

/// レビュー
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Review {
    pub id: Uuid,
    pub product_id: Uuid,
    pub user_id: Uuid,
    pub user_name: String,
    pub rating: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    pub is_verified_purchase: bool,
    pub is_approved: bool,
    pub created_at: DateTime<Utc>,
}

/// レビュー作成リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateReviewRequest {
    #[validate(range(min = 1, max = 5))]
    pub rating: i32,
    #[validate(length(max = 100))]
    pub title: Option<String>,
    #[validate(length(max = 2000))]
    pub content: Option<String>,
}

/// レビュー統計
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewStats {
    pub product_id: Uuid,
    pub average_rating: f64,
    pub total_reviews: i32,
    pub rating_distribution: RatingDistribution,
}

/// 評価分布
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RatingDistribution {
    pub one_star: i32,
    pub two_star: i32,
    pub three_star: i32,
    pub four_star: i32,
    pub five_star: i32,
}

impl Default for RatingDistribution {
    fn default() -> Self {
        Self {
            one_star: 0,
            two_star: 0,
            three_star: 0,
            four_star: 0,
            five_star: 0,
        }
    }
}
