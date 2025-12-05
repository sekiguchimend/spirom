use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::AuthenticatedClient;
use crate::error::Result;
use crate::models::{Cart, CartItem};

pub struct CartRepository {
    client: AuthenticatedClient,
}

impl CartRepository {
    pub fn new(client: AuthenticatedClient) -> Self {
        Self { client }
    }

    /// カート取得
    pub async fn find_by_session(&self, session_id: &str) -> Result<Cart> {
        let mut cart = Cart::new(session_id.to_string());

        // カートアイテム取得
        let query = format!("session_id=eq.{}", urlencoding::encode(session_id));
        let items: Vec<CartItemRow> = self.client.select("cart_items", &query).await?;

        cart.items = items.into_iter().map(|r| r.into_cart_item()).collect();
        cart.calculate_totals();

        // メタデータ取得
        let meta_query = format!("session_id=eq.{}", urlencoding::encode(session_id));
        let meta: Option<CartMetaRow> = self.client.select_single("cart_metadata", &meta_query).await?;

        if let Some(meta) = meta {
            cart.user_id = meta.user_id;
            cart.created_at = meta.created_at;
            cart.updated_at = meta.updated_at;
        }

        Ok(cart)
    }

    /// カートにアイテム追加/更新
    pub async fn add_item(&self, session_id: &str, item: &CartItem) -> Result<()> {
        // メタデータが存在しない場合は作成
        self.ensure_metadata(session_id, None).await?;

        // UPSERT（存在すれば更新、なければ挿入）
        let input = CartItemInput {
            id: Uuid::new_v4(),
            session_id: session_id.to_string(),
            product_id: item.product_id,
            product_name: Some(item.product_name.clone()),
            product_slug: Some(item.product_slug.clone()),
            price: Some(item.price),
            quantity: item.quantity,
            image_url: item.image_url.clone(),
            added_at: item.added_at,
        };

        // session_id, product_idの組み合わせでupsert
        let _: CartItemRow = self.client.upsert("cart_items", &input, "session_id,product_id").await?;
        self.update_metadata_timestamp(session_id).await?;

        Ok(())
    }

    /// アイテム数量更新
    pub async fn update_quantity(&self, session_id: &str, product_id: Uuid, quantity: i32) -> Result<()> {
        let query = format!(
            "session_id=eq.{}&product_id=eq.{}",
            urlencoding::encode(session_id),
            product_id
        );
        let update = QuantityUpdate { quantity };

        let _: Vec<CartItemRow> = self.client.update("cart_items", &query, &update).await?;
        self.update_metadata_timestamp(session_id).await?;

        Ok(())
    }

    /// アイテム削除
    pub async fn remove_item(&self, session_id: &str, product_id: Uuid) -> Result<()> {
        let query = format!(
            "session_id=eq.{}&product_id=eq.{}",
            urlencoding::encode(session_id),
            product_id
        );
        self.client.delete("cart_items", &query).await?;
        self.update_metadata_timestamp(session_id).await?;

        Ok(())
    }

    /// カートクリア
    pub async fn clear(&self, session_id: &str) -> Result<()> {
        let query = format!("session_id=eq.{}", urlencoding::encode(session_id));
        self.client.delete("cart_items", &query).await?;
        self.client.delete("cart_metadata", &query).await?;

        Ok(())
    }

    /// カート統合（ゲスト → ログインユーザー）
    pub async fn merge(&self, guest_session_id: &str, user_session_id: &str, user_id: Uuid) -> Result<()> {
        // ゲストのカートを取得
        let guest_cart = self.find_by_session(guest_session_id).await?;

        // ゲストのアイテムをユーザーのカートに追加
        for item in guest_cart.items {
            self.add_item(user_session_id, &item).await?;
        }

        // ユーザーIDを紐付け
        self.update_user_id(user_session_id, user_id).await?;

        // ゲストカートをクリア
        self.clear(guest_session_id).await?;

        Ok(())
    }

    /// メタデータが存在しない場合は作成
    async fn ensure_metadata(&self, session_id: &str, user_id: Option<Uuid>) -> Result<()> {
        let now = Utc::now();

        let input = CartMetaInput {
            session_id: session_id.to_string(),
            user_id,
            created_at: now,
            updated_at: now,
        };

        // session_idでupsert（存在する場合は何もしない）
        let _: CartMetaRow = self.client.upsert("cart_metadata", &input, "session_id").await?;

        Ok(())
    }

    /// メタデータのタイムスタンプ更新
    async fn update_metadata_timestamp(&self, session_id: &str) -> Result<()> {
        let query = format!("session_id=eq.{}", urlencoding::encode(session_id));
        let update = TimestampUpdate {
            updated_at: Utc::now(),
        };

        let _: Vec<CartMetaRow> = self.client.update("cart_metadata", &query, &update).await?;

        Ok(())
    }

    /// ユーザーID更新
    async fn update_user_id(&self, session_id: &str, user_id: Uuid) -> Result<()> {
        let query = format!("session_id=eq.{}", urlencoding::encode(session_id));
        let update = UserIdUpdate {
            user_id: Some(user_id),
        };

        let _: Vec<CartMetaRow> = self.client.update("cart_metadata", &query, &update).await?;

        Ok(())
    }
}

// Supabase REST API用の構造体
#[derive(Debug, Serialize)]
struct CartItemInput {
    id: Uuid,
    session_id: String,
    product_id: Uuid,
    product_name: Option<String>,
    product_slug: Option<String>,
    price: Option<i64>,
    quantity: i32,
    image_url: Option<String>,
    added_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct QuantityUpdate {
    quantity: i32,
}

#[derive(Debug, Serialize)]
struct CartMetaInput {
    session_id: String,
    user_id: Option<Uuid>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct TimestampUpdate {
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct UserIdUpdate {
    user_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
struct CartItemRow {
    #[allow(dead_code)]
    id: Uuid,
    #[allow(dead_code)]
    session_id: String,
    product_id: Uuid,
    product_name: Option<String>,
    product_slug: Option<String>,
    price: Option<i64>,
    quantity: i32,
    image_url: Option<String>,
    added_at: DateTime<Utc>,
}

impl CartItemRow {
    fn into_cart_item(self) -> CartItem {
        let price = self.price.unwrap_or(0);
        CartItem {
            product_id: self.product_id,
            product_name: self.product_name.unwrap_or_default(),
            product_slug: self.product_slug.unwrap_or_default(),
            price,
            quantity: self.quantity,
            subtotal: price * self.quantity as i64,
            image_url: self.image_url,
            added_at: self.added_at,
        }
    }
}

#[derive(Debug, Deserialize)]
struct CartMetaRow {
    #[allow(dead_code)]
    session_id: String,
    user_id: Option<Uuid>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
