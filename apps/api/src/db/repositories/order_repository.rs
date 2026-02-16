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
            // ゲスト注文用フィールド
            is_guest_order: if order.is_guest_order { Some(true) } else { None },
            guest_email: order.guest_email.clone(),
            guest_name: order.guest_name.clone(),
            guest_phone: order.guest_phone.clone(),
            guest_access_token_hash: order.guest_access_token_hash.clone(),
            guest_token_expires_at: order.guest_token_expires_at,
        };

        let result: OrderRow = self.client.insert("orders", &input).await?;

        // order_itemsテーブルに挿入
        for item in &order.items {
            let item_input = OrderItemInput {
                id: Uuid::new_v4(),
                order_id: order.id,
                order_created_at: order.created_at,
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

    /// ユーザーの注文履歴取得（N+1問題回避済み）
    pub async fn find_by_user(&self, user_id: Uuid, limit: i32) -> Result<Vec<OrderSummary>> {
        // 1. 注文一覧取得
        let query = format!(
            "user_id=eq.{}&order=created_at.desc&limit={}",
            user_id, limit
        );
        let orders: Vec<OrderRow> = self.client.select("orders", &query).await?;

        if orders.is_empty() {
            return Ok(vec![]);
        }

        // 2. 全注文のIDを収集してアイテムを一括取得
        let order_ids: Vec<String> = orders.iter().map(|o| o.id.to_string()).collect();
        let item_query = format!("order_id=in.({})", order_ids.join(","));
        let items: Vec<OrderItemWithOrderId> = self.client.select("order_items", &item_query).await?;

        // 3. order_idごとにアイテム数をカウント
        let mut item_counts: std::collections::HashMap<Uuid, i32> = std::collections::HashMap::new();
        for item in items {
            *item_counts.entry(item.order_id).or_insert(0) += 1;
        }

        // 4. サマリー作成
        let summaries = orders
            .into_iter()
            .map(|order| {
                let item_count = item_counts.get(&order.id).copied().unwrap_or(0);
                OrderSummary {
                    id: order.id,
                    order_number: order.order_number,
                    status: order.status.parse().unwrap_or_default(),
                    payment_status: serde_json::from_str(&order.payment_status).unwrap_or_default(),
                    total: order.total,
                    currency: order.currency,
                    item_count,
                    created_at: order.created_at,
                    shipped_at: order.shipped_at,
                    delivered_at: order.delivered_at,
                }
            })
            .collect();

        Ok(summaries)
    }

    /// 注文アイテム取得
    async fn find_order_items(&self, order_id: Uuid) -> Result<Vec<OrderItem>> {
        let query = format!("order_id=eq.{}", order_id);
        let rows: Vec<OrderItemRow> = self.client.select("order_items", &query).await?;

        Ok(rows.into_iter().map(|r| r.into_order_item()).collect())
    }

    /// ステータス更新
    pub async fn update_status(&self, id: Uuid, _user_id: Option<Uuid>, status: OrderStatus, _created_at: i64) -> Result<()> {
        let query = format!("id=eq.{}", id);
        let update = StatusUpdate {
            status: status.to_string(),
            updated_at: Utc::now(),
        };

        let _: Vec<OrderRow> = self.client.update("orders", &query, &update).await?;
        Ok(())
    }

    /// ステータス更新（条件付き：現在ステータスが一致する場合のみ更新する）
    /// - 競合（Webhook/リカバリ/ユーザー操作の同時実行）で二重在庫戻し等を起こさないために使用
    pub async fn update_status_if_current(&self, id: Uuid, current: OrderStatus, next: OrderStatus) -> Result<bool> {
        let query = format!("id=eq.{}&status=eq.{}", id, current.to_string());
        let update = StatusUpdate {
            status: next.to_string(),
            updated_at: Utc::now(),
        };

        let updated: Vec<OrderRow> = self.client.update("orders", &query, &update).await?;
        Ok(!updated.is_empty())
    }

    /// リカバリ用：決済待ち（PendingPayment）かつ一定時間経過した注文を取得
    /// - items は含まれないため、必要なら `find_by_id` で取得する
    pub async fn find_pending_payment_for_reconcile(
        &self,
        created_before: DateTime<Utc>,
        limit: i32,
    ) -> Result<Vec<OrderReconcileRow>> {
        let ts = created_before.to_rfc3339();
        let query = format!(
            "status=eq.pending_payment&created_at=lt.{}&select=id,created_at,payment_id&order=created_at.asc&limit={}",
            urlencoding::encode(&ts),
            limit
        );
        let rows: Vec<OrderReconcileRow> = self.client.select("orders", &query).await?;
        Ok(rows)
    }

    /// 決済ID更新
    pub async fn update_payment_id(&self, id: Uuid, _user_id: Option<Uuid>, payment_id: &str) -> Result<()> {
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

    /// ゲストトークンで注文取得（直接クエリ版 - service_role用）
    pub async fn find_by_guest_token(&self, token_hash: &str, order_id: Uuid) -> Result<Option<Order>> {
        let query = format!(
            "id=eq.{}&guest_access_token_hash=eq.{}&is_guest_order=eq.true",
            order_id, token_hash
        );
        let result: Option<OrderRow> = self.client.select_single("orders", &query).await?;

        if let Some(row) = result {
            // トークンの有効期限を確認
            if let Some(expires_at) = row.guest_token_expires_at {
                if expires_at < Utc::now() {
                    return Ok(None); // トークン期限切れ
                }
            }
            let mut order = row.into_order();
            order.items = self.find_order_items(order_id).await?;
            Ok(Some(order))
        } else {
            Ok(None)
        }
    }

    /// ゲストトークンで注文取得（RPC関数版 - anon key用）
    /// SECURITY DEFINER関数を使用してトークン検証と取得を行う
    pub async fn find_by_guest_token_rpc(&self, token_hash: &str, order_id: Uuid) -> Result<Option<Order>> {
        #[derive(serde::Serialize)]
        struct RpcParams {
            p_order_id: Uuid,
            p_token_hash: String,
        }

        let params = RpcParams {
            p_order_id: order_id,
            p_token_hash: token_hash.to_string(),
        };

        // RPC関数を呼び出し
        let rows: Vec<OrderRow> = self.client.rpc("get_guest_order_by_token", &params).await?;

        if let Some(row) = rows.into_iter().next() {
            let mut order = row.into_order();
            // アイテムもRPC関数で取得
            order.items = self.find_guest_order_items_rpc(token_hash, order_id).await?;
            Ok(Some(order))
        } else {
            Ok(None)
        }
    }

    /// ゲスト注文のアイテム取得（RPC関数版）
    async fn find_guest_order_items_rpc(&self, token_hash: &str, order_id: Uuid) -> Result<Vec<OrderItem>> {
        #[derive(serde::Serialize)]
        struct RpcParams {
            p_order_id: Uuid,
            p_token_hash: String,
        }

        let params = RpcParams {
            p_order_id: order_id,
            p_token_hash: token_hash.to_string(),
        };

        let rows: Vec<OrderItemRow> = self.client.rpc("get_guest_order_items_by_token", &params).await?;
        Ok(rows.into_iter().map(|r| r.into_order_item()).collect())
    }

    /// ゲスト注文のpayment_id更新（RPC関数版 - トークン検証付き）
    pub async fn update_guest_order_payment_id_rpc(
        &self,
        order_id: Uuid,
        token_hash: &str,
        payment_id: &str,
    ) -> Result<bool> {
        #[derive(serde::Serialize)]
        struct RpcParams {
            p_order_id: Uuid,
            p_token_hash: String,
            p_payment_id: String,
        }

        let params = RpcParams {
            p_order_id: order_id,
            p_token_hash: token_hash.to_string(),
            p_payment_id: payment_id.to_string(),
        };

        self.client.rpc("update_guest_order_payment_id", &params).await
    }

    /// ゲスト注文のステータス更新（RPC関数版 - トークン検証付き）
    pub async fn update_guest_order_status_rpc(
        &self,
        order_id: Uuid,
        token_hash: &str,
        status: &str,
        payment_status: Option<&str>,
    ) -> Result<bool> {
        #[derive(serde::Serialize)]
        struct RpcParams {
            p_order_id: Uuid,
            p_token_hash: String,
            p_status: String,
            #[serde(skip_serializing_if = "Option::is_none")]
            p_payment_status: Option<String>,
        }

        let params = RpcParams {
            p_order_id: order_id,
            p_token_hash: token_hash.to_string(),
            p_status: status.to_string(),
            p_payment_status: payment_status.map(|s| s.to_string()),
        };

        self.client.rpc("update_guest_order_status", &params).await
    }

    /// Webhook用の注文更新（RPC関数版 - ステータス遷移チェック付き）
    pub async fn update_order_from_webhook_rpc(
        &self,
        order_id: Uuid,
        payment_id: Option<&str>,
        status: Option<&str>,
        payment_status: Option<&str>,
    ) -> Result<bool> {
        #[derive(serde::Serialize)]
        struct RpcParams {
            p_order_id: Uuid,
            #[serde(skip_serializing_if = "Option::is_none")]
            p_payment_id: Option<String>,
            #[serde(skip_serializing_if = "Option::is_none")]
            p_status: Option<String>,
            #[serde(skip_serializing_if = "Option::is_none")]
            p_payment_status: Option<String>,
        }

        let params = RpcParams {
            p_order_id: order_id,
            p_payment_id: payment_id.map(|s| s.to_string()),
            p_status: status.map(|s| s.to_string()),
            p_payment_status: payment_status.map(|s| s.to_string()),
        };

        self.client.rpc("update_order_from_webhook", &params).await
    }

    /// ゲスト注文作成（RPC関数版 - SECURITY DEFINER、注文とアイテムを同時作成）
    pub async fn create_guest_order_rpc(&self, order: &Order) -> Result<Order> {
        #[derive(serde::Serialize)]
        struct RpcParams {
            p_order_id: Uuid,
            p_order_number: String,
            p_status: String,
            p_items: serde_json::Value,
            p_subtotal: i64,
            p_shipping_fee: i64,
            p_tax: i64,
            p_total: i64,
            p_currency: String,
            p_shipping_address: serde_json::Value,
            p_billing_address: Option<serde_json::Value>,
            p_payment_method: String,
            p_payment_status: String,
            p_notes: Option<String>,
            p_guest_email: Option<String>,
            p_guest_name: Option<String>,
            p_guest_phone: Option<String>,
            p_guest_access_token_hash: Option<String>,
            p_guest_token_expires_at: Option<DateTime<Utc>>,
        }

        let params = RpcParams {
            p_order_id: order.id,
            p_order_number: order.order_number.clone(),
            p_status: order.status.to_string(),
            p_items: serde_json::to_value(&order.items).unwrap_or_default(),
            p_subtotal: order.subtotal,
            p_shipping_fee: order.shipping_fee,
            p_tax: order.tax,
            p_total: order.total,
            p_currency: order.currency.clone(),
            p_shipping_address: serde_json::to_value(&order.shipping_address).unwrap_or_default(),
            p_billing_address: order.billing_address.as_ref().and_then(|a| serde_json::to_value(a).ok()),
            p_payment_method: order.payment_method.to_string(),
            p_payment_status: serde_json::to_string(&order.payment_status).unwrap_or_default(),
            p_notes: order.notes.clone(),
            p_guest_email: order.guest_email.clone(),
            p_guest_name: order.guest_name.clone(),
            p_guest_phone: order.guest_phone.clone(),
            p_guest_access_token_hash: order.guest_access_token_hash.clone(),
            p_guest_token_expires_at: order.guest_token_expires_at,
        };

        // 注文とアイテムを同時作成するRPC関数を呼び出し
        let result: serde_json::Value = self.client.rpc("create_guest_order_with_items", &params).await?;

        // RPC関数から返されたJSONBをOrderに変換
        let order_row: OrderRow = serde_json::from_value(result)
            .map_err(|e| crate::error::AppError::Database(format!("Parse error: {}", e)))?;

        let mut created_order = order_row.into_order();
        created_order.items = order.items.clone();
        Ok(created_order)
    }

    /// Webhook用の注文取得（RPC関数版）
    pub async fn find_by_id_for_webhook(&self, order_id: Uuid) -> Result<Option<Order>> {
        #[derive(serde::Serialize)]
        struct RpcParams {
            p_order_id: Uuid,
        }

        let params = RpcParams { p_order_id: order_id };
        let rows: Vec<OrderRow> = self.client.rpc("get_order_for_webhook", &params).await?;

        if let Some(row) = rows.into_iter().next() {
            let mut order = row.into_order();
            order.items = self.find_order_items_for_webhook(order_id).await?;
            Ok(Some(order))
        } else {
            Ok(None)
        }
    }

    /// Webhook用の注文アイテム取得（RPC関数版）
    async fn find_order_items_for_webhook(&self, order_id: Uuid) -> Result<Vec<OrderItem>> {
        #[derive(serde::Serialize)]
        struct RpcParams {
            p_order_id: Uuid,
        }

        let params = RpcParams { p_order_id: order_id };
        let rows: Vec<OrderItemRow> = self.client.rpc("get_order_items_for_webhook", &params).await?;
        Ok(rows.into_iter().map(|r| r.into_order_item()).collect())
    }

    /// 全注文取得（管理者用）
    pub async fn find_all(&self, limit: i32) -> Result<Vec<OrderSummary>> {
        let query = format!("order=created_at.desc&limit={}", limit);
        let orders: Vec<OrderRow> = self.client.select("orders", &query).await?;

        if orders.is_empty() {
            return Ok(vec![]);
        }

        // アイテム数を取得
        let order_ids: Vec<String> = orders.iter().map(|o| o.id.to_string()).collect();
        let item_query = format!("order_id=in.({})", order_ids.join(","));
        let items: Vec<OrderItemWithOrderId> = self.client.select("order_items", &item_query).await?;

        let mut item_counts: std::collections::HashMap<Uuid, i32> = std::collections::HashMap::new();
        for item in items {
            *item_counts.entry(item.order_id).or_insert(0) += 1;
        }

        let summaries = orders
            .into_iter()
            .map(|order| {
                let item_count = item_counts.get(&order.id).copied().unwrap_or(0);
                OrderSummary {
                    id: order.id,
                    order_number: order.order_number,
                    status: order.status.parse().unwrap_or_default(),
                    payment_status: serde_json::from_str(&order.payment_status).unwrap_or_default(),
                    total: order.total,
                    currency: order.currency,
                    item_count,
                    created_at: order.created_at,
                    shipped_at: order.shipped_at,
                    delivered_at: order.delivered_at,
                }
            })
            .collect();

        Ok(summaries)
    }
}

// Supabase REST API用の構造体
#[derive(Debug, Serialize)]
struct OrderInput {
    id: Uuid,
    #[serde(skip_serializing_if = "Option::is_none")]
    user_id: Option<Uuid>,
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
    // ゲスト注文用フィールド
    #[serde(skip_serializing_if = "Option::is_none")]
    is_guest_order: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    guest_email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    guest_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    guest_phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    guest_access_token_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    guest_token_expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
struct OrderItemInput {
    id: Uuid,
    order_id: Uuid,
    order_created_at: DateTime<Utc>,
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
    user_id: Option<Uuid>,
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
    // ゲスト注文用フィールド
    #[serde(default)]
    is_guest_order: Option<bool>,
    guest_email: Option<String>,
    guest_name: Option<String>,
    guest_phone: Option<String>,
    guest_access_token_hash: Option<String>,
    guest_token_expires_at: Option<DateTime<Utc>>,
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
            // ゲスト注文用フィールド
            is_guest_order: self.is_guest_order.unwrap_or(false),
            guest_email: self.guest_email,
            guest_name: self.guest_name,
            guest_phone: self.guest_phone,
            guest_access_token_hash: self.guest_access_token_hash,
            guest_token_expires_at: self.guest_token_expires_at,
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

#[derive(Debug, Deserialize)]
struct OrderItemWithOrderId {
    #[allow(dead_code)]
    id: Uuid,
    order_id: Uuid,
}

/// リカバリ/回収用の最小行
#[derive(Debug, Deserialize)]
pub struct OrderReconcileRow {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub payment_id: Option<String>,
}
