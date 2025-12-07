use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::AuthenticatedClient;
use crate::error::Result;
use crate::models::{Order, OrderItem, OrderStatus, OrderSummary, PaymentMethod};

pub struct OrderRepository {
    client: AuthenticatedClient,
}

impl OrderRepository {
    pub fn new(client: AuthenticatedClient) -> Self {
        Self { client }
    }

    /// 注文作成
    pub async fn create(&self, order: &Order) -> Result<Order> {
        // ordersテーブルに挿入
        let input = OrderInput {
            id: order.id,
            user_id: order.user_id,
            order_number: order.order_number.clone(),
            status: order.status.to_string(),
            subtotal: order.subtotal,
            shipping_fee: order.shipping_fee,
            tax: order.tax,
            total: order.total,
            currency: order.currency.clone(),
            shipping_address: serde_json::to_value(&order.shipping_address).unwrap_or_default(),
            billing_address: order.billing_address.as_ref().and_then(|a| serde_json::to_value(a).ok()),
            payment_method: order.payment_method.to_string(),
            payment_status: serde_json::to_string(&order.payment_status).unwrap_or_default(),
            payment_id: order.payment_id.clone(),
            notes: order.notes.clone(),
            created_at: order.created_at,
            updated_at: order.updated_at,
        };

        let result: OrderRow = self.client.insert("orders", &input).await?;

        // order_itemsテーブルに挿入
        for item in &order.items {
            let item_input = OrderItemInput {
                id: Uuid::new_v4(),
                order_id: order.id,
                product_id: Some(item.product_id),
                product_name: item.product_name.clone(),
                product_sku: Some(item.product_sku.clone()),
                price: item.price,
                quantity: item.quantity,
                subtotal: item.subtotal,
                image_url: item.image_url.clone(),
            };

            let _: OrderItemRow = self.client.insert("order_items", &item_input).await?;
        }

        let mut created_order = result.into_order();
        created_order.items = order.items.clone();
        Ok(created_order)
    }

    /// IDで注文取得
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Order>> {
        let query = format!("id=eq.{}", id);
        let result: Option<OrderRow> = self.client.select_single("orders", &query).await?;

        if let Some(row) = result {
            let mut order = row.into_order();
            order.items = self.find_order_items(id).await?;
            Ok(Some(order))
        } else {
            Ok(None)
        }
    }

    /// ユーザーの注文履歴取得
    pub async fn find_by_user(&self, user_id: Uuid, limit: i32) -> Result<Vec<OrderSummary>> {
        // 注文一覧取得
        let query = format!(
            "user_id=eq.{}&order=created_at.desc&limit={}",
            user_id, limit
        );
        let orders: Vec<OrderRow> = self.client.select("orders", &query).await?;

        let mut summaries = Vec::new();
        for order in orders {
            // 各注文のアイテム数を取得
            let item_query = format!("order_id=eq.{}&select=id", order.id);
            let items: Vec<IdOnly> = self.client.select("order_items", &item_query).await?;

            summaries.push(OrderSummary {
                id: order.id,
                order_number: order.order_number,
                status: order.status.parse().unwrap_or_default(),
                total: order.total,
                currency: order.currency,
                item_count: items.len() as i32,
                created_at: order.created_at,
            });
        }

        Ok(summaries)
    }

    /// 注文アイテム取得
    async fn find_order_items(&self, order_id: Uuid) -> Result<Vec<OrderItem>> {
        let query = format!("order_id=eq.{}", order_id);
        let rows: Vec<OrderItemRow> = self.client.select("order_items", &query).await?;

        Ok(rows.into_iter().map(|r| r.into_order_item()).collect())
    }

    /// ステータス更新
    pub async fn update_status(&self, id: Uuid, _user_id: Uuid, status: OrderStatus, _created_at: i64) -> Result<()> {
        let query = format!("id=eq.{}", id);
        let update = StatusUpdate {
            status: status.to_string(),
            updated_at: Utc::now(),
        };

        let _: Vec<OrderRow> = self.client.update("orders", &query, &update).await?;
        Ok(())
    }

    /// 決済ID更新
    pub async fn update_payment_id(&self, id: Uuid, _user_id: Uuid, payment_id: &str) -> Result<()> {
        let query = format!("id=eq.{}", id);
        let update = PaymentIdUpdate {
            payment_id: Some(payment_id.to_string()),
            updated_at: Utc::now(),
        };

        let _: Vec<OrderRow> = self.client.update("orders", &query, &update).await?;
        Ok(())
    }

    /// 決済ステータス更新
    pub async fn update_payment_status(&self, id: Uuid, payment_status: crate::models::PaymentStatus) -> Result<()> {
        let query = format!("id=eq.{}", id);
        let update = PaymentStatusUpdate {
            payment_status: serde_json::to_string(&payment_status).unwrap_or_default(),
            updated_at: Utc::now(),
        };

        let _: Vec<OrderRow> = self.client.update("orders", &query, &update).await?;
        Ok(())
    }

    /// 発送日時更新
    pub async fn update_shipped_at(&self, id: Uuid) -> Result<()> {
        let now = Utc::now();
        let query = format!("id=eq.{}", id);
        let update = ShippedAtUpdate {
            shipped_at: Some(now),
            updated_at: now,
        };

        let _: Vec<OrderRow> = self.client.update("orders", &query, &update).await?;
        Ok(())
    }

    /// 配達日時更新
    pub async fn update_delivered_at(&self, id: Uuid) -> Result<()> {
        let now = Utc::now();
        let query = format!("id=eq.{}", id);
        let update = DeliveredAtUpdate {
            delivered_at: Some(now),
            updated_at: now,
        };

        let _: Vec<OrderRow> = self.client.update("orders", &query, &update).await?;
        Ok(())
    }
}

// Supabase REST API用の構造体
#[derive(Debug, Serialize)]
struct OrderInput {
    id: Uuid,
    user_id: Uuid,
    order_number: String,
    status: String,
    subtotal: i64,
    shipping_fee: i64,
    tax: i64,
    total: i64,
    currency: String,
    shipping_address: serde_json::Value,
    billing_address: Option<serde_json::Value>,
    payment_method: String,
    payment_status: String,
    payment_id: Option<String>,
    notes: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct OrderItemInput {
    id: Uuid,
    order_id: Uuid,
    product_id: Option<Uuid>,
    product_name: String,
    product_sku: Option<String>,
    price: i64,
    quantity: i32,
    subtotal: i64,
    image_url: Option<String>,
}

#[derive(Debug, Serialize)]
struct StatusUpdate {
    status: String,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct PaymentIdUpdate {
    payment_id: Option<String>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct PaymentStatusUpdate {
    payment_status: String,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct ShippedAtUpdate {
    shipped_at: Option<DateTime<Utc>>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct DeliveredAtUpdate {
    delivered_at: Option<DateTime<Utc>>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct OrderRow {
    id: Uuid,
    user_id: Uuid,
    order_number: String,
    status: String,
    subtotal: i64,
    shipping_fee: i64,
    tax: i64,
    total: i64,
    currency: String,
    shipping_address: serde_json::Value,
    billing_address: Option<serde_json::Value>,
    payment_method: String,
    payment_status: String,
    payment_id: Option<String>,
    notes: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    shipped_at: Option<DateTime<Utc>>,
    delivered_at: Option<DateTime<Utc>>,
}

impl OrderRow {
    fn into_order(self) -> Order {
        Order {
            id: self.id,
            user_id: self.user_id,
            order_number: self.order_number,
            status: self.status.parse().unwrap_or_default(),
            items: vec![],
            subtotal: self.subtotal,
            shipping_fee: self.shipping_fee,
            tax: self.tax,
            total: self.total,
            currency: self.currency,
            shipping_address: serde_json::from_value(self.shipping_address).unwrap_or_default(),
            billing_address: self.billing_address.and_then(|v| serde_json::from_value(v).ok()),
            payment_method: serde_json::from_str(&format!("\"{}\"", self.payment_method))
                .unwrap_or(PaymentMethod::CreditCard),
            payment_status: serde_json::from_str(&self.payment_status).unwrap_or_default(),
            payment_id: self.payment_id,
            notes: self.notes,
            created_at: self.created_at,
            updated_at: self.updated_at,
            shipped_at: self.shipped_at,
            delivered_at: self.delivered_at,
        }
    }
}

#[derive(Debug, Deserialize)]
struct OrderItemRow {
    #[allow(dead_code)]
    id: Uuid,
    #[allow(dead_code)]
    order_id: Uuid,
    product_id: Option<Uuid>,
    product_name: String,
    product_sku: Option<String>,
    price: i64,
    quantity: i32,
    subtotal: i64,
    image_url: Option<String>,
}

impl OrderItemRow {
    fn into_order_item(self) -> OrderItem {
        OrderItem {
            product_id: self.product_id.unwrap_or_default(),
            product_name: self.product_name,
            product_sku: self.product_sku.unwrap_or_default(),
            price: self.price,
            quantity: self.quantity,
            subtotal: self.subtotal,
            image_url: self.image_url,
        }
    }
}

#[derive(Debug, Deserialize)]
struct IdOnly {
    #[allow(dead_code)]
    id: Uuid,
}
