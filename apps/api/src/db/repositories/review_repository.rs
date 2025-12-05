use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::AuthenticatedClient;
use crate::error::Result;
use crate::models::{RatingDistribution, Review, ReviewStats};

pub struct ReviewRepository {
    client: AuthenticatedClient,
}

impl ReviewRepository {
    pub fn new(client: AuthenticatedClient) -> Self {
        Self { client }
    }

    /// レビュー作成
    pub async fn create(&self, review: &Review) -> Result<Review> {
        let input = ReviewInput {
            id: review.id,
            product_id: review.product_id,
            user_id: review.user_id,
            user_name: review.user_name.clone(),
            rating: review.rating,
            title: review.title.clone(),
            content: review.content.clone(),
            is_verified_purchase: review.is_verified_purchase,
            is_approved: review.is_approved,
            created_at: review.created_at,
        };

        let result: ReviewRow = self.client.insert("reviews", &input).await?;
        Ok(result.into_review())
    }

    /// 商品のレビュー一覧取得（承認済みのみ）
    pub async fn find_by_product(&self, product_id: Uuid, limit: i32) -> Result<Vec<Review>> {
        let query = format!(
            "product_id=eq.{}&is_approved=eq.true&order=created_at.desc&limit={}",
            product_id, limit
        );
        let results: Vec<ReviewRow> = self.client.select("reviews", &query).await?;

        Ok(results.into_iter().map(|r| r.into_review()).collect())
    }

    /// レビュー統計取得（SEO用aggregateRating対応）
    /// SupabaseのRPC関数を使用してパフォーマンス向上
    pub async fn get_stats(&self, product_id: Uuid) -> Result<ReviewStats> {
        #[derive(Serialize)]
        struct Params {
            p_product_id: Uuid,
        }

        #[derive(Deserialize)]
        struct StatsResult {
            average_rating: f64,
            total_reviews: i64,
            one_star: i64,
            two_star: i64,
            three_star: i64,
            four_star: i64,
            five_star: i64,
        }

        let params = Params { p_product_id: product_id };

        // RPC関数を呼び出し（配列で返ってくる）
        let results: Vec<StatsResult> = self.client.rpc("get_review_stats", &params).await?;

        let stats = results.into_iter().next().unwrap_or(StatsResult {
            average_rating: 0.0,
            total_reviews: 0,
            one_star: 0,
            two_star: 0,
            three_star: 0,
            four_star: 0,
            five_star: 0,
        });

        Ok(ReviewStats {
            product_id,
            average_rating: stats.average_rating,
            total_reviews: stats.total_reviews as i32,
            rating_distribution: RatingDistribution {
                one_star: stats.one_star as i32,
                two_star: stats.two_star as i32,
                three_star: stats.three_star as i32,
                four_star: stats.four_star as i32,
                five_star: stats.five_star as i32,
            },
        })
    }

    /// ユーザーが商品を購入済みか確認
    pub async fn has_purchased(&self, user_id: Uuid, product_id: Uuid) -> Result<bool> {
        // 注文アイテムからユーザーが商品を購入済みか確認
        // orders経由でuser_idとorder_itemsのproduct_idを確認
        let query = format!(
            "product_id=eq.{}&select=id,orders!inner(user_id,status)&orders.user_id=eq.{}&orders.status=neq.cancelled",
            product_id, user_id
        );
        let results: Vec<IdOnly> = self.client.select("order_items", &query).await?;

        Ok(!results.is_empty())
    }

    /// ユーザーが既にレビュー済みか確認
    pub async fn has_reviewed(&self, user_id: Uuid, product_id: Uuid) -> Result<bool> {
        let query = format!(
            "user_id=eq.{}&product_id=eq.{}&select=id",
            user_id, product_id
        );
        let results: Vec<IdOnly> = self.client.select("reviews", &query).await?;

        Ok(!results.is_empty())
    }
}

// Supabase REST API用の構造体
#[derive(Debug, Serialize)]
struct ReviewInput {
    id: Uuid,
    product_id: Uuid,
    user_id: Uuid,
    user_name: String,
    rating: i32,
    title: Option<String>,
    content: Option<String>,
    is_verified_purchase: bool,
    is_approved: bool,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct ReviewRow {
    id: Uuid,
    product_id: Uuid,
    user_id: Uuid,
    user_name: String,
    rating: i32,
    title: Option<String>,
    content: Option<String>,
    is_verified_purchase: bool,
    is_approved: bool,
    created_at: DateTime<Utc>,
}

impl ReviewRow {
    fn into_review(self) -> Review {
        Review {
            id: self.id,
            product_id: self.product_id,
            user_id: self.user_id,
            user_name: self.user_name,
            rating: self.rating,
            title: self.title,
            content: self.content,
            is_verified_purchase: self.is_verified_purchase,
            is_approved: self.is_approved,
            created_at: self.created_at,
        }
    }
}

#[derive(Debug, Deserialize)]
struct IdOnly {
    #[allow(dead_code)]
    id: Uuid,
}
