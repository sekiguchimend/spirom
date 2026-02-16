use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Extension, Json,
};
use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::db::repositories::{CartRepository, OrderRepository, ProductRepository, UserRepository};
use crate::error::{AppError, Result};
use crate::middleware::generate_session_id;
use crate::models::{
    AuthenticatedUser, CreateOrderRequest, CreateGuestOrderRequest, DataResponse, Order, OrderAddress, OrderItem,
    OrderStatus, OrderSummary, PaginatedResponse, PaymentStatus,
    calculate_shipping_fee, calculate_tax, generate_order_number,
    generate_guest_access_token, guest_token_expiry, hash_guest_token,
};
use crate::services::payment::{PaymentProvider, StripePaymentProvider};
use crate::handlers::users::ensure_user_profile;

/// 注文作成
pub async fn create_order(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    headers: HeaderMap,
    Json(req): Json<CreateOrderRequest>,
) -> Result<Json<DataResponse<Order>>> {
    req.validate()?;
    // デバッグ（トークン自体は出さない）
    if std::env::var("API_DEBUG_AUTH")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
    {
        tracing::info!(
            "[orders] create_order: auth_user_id={}, token_len={}",
            auth_user.id,
            token.len()
        );
    }

    let session_id = headers
        .get("X-Session-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(generate_session_id);

    // 注文作成は「本人トークン」でINSERTし、RLSポリシー（auth.uid = user_id）を正しく通す。
    // 在庫確保/商品更新など管理系操作のみ service_role を使う。
    let db_service = state.db.service();
    let cart_repo = CartRepository::new(db_service.clone());
    let product_repo = ProductRepository::new(db_service);
    let order_repo = OrderRepository::new(state.db.with_auth(&token));
    let user_repo = UserRepository::new(state.db.with_auth(&token));

    // リクエストボディのitemsを優先的に使用、なければカートから取得
    let source_items = if let Some(ref items) = req.items {
        if items.is_empty() {
            return Err(AppError::BadRequest("注文アイテムが指定されていません".to_string()));
        }
        // 各アイテムのバリデーション
        for item in items {
            item.validate()?;
        }
        items.clone()
    } else {
        // カートから取得
        let cart = cart_repo.find_by_session(&session_id).await?;
        if cart.items.is_empty() {
            return Err(AppError::BadRequest("カートが空です".to_string()));
        }
        // カートアイテムをOrderItemRequestに変換
        cart.items
            .iter()
            .map(|item| crate::models::OrderItemRequest {
                product_id: item.product_id,
                quantity: item.quantity,
            })
            .collect()
    };

    // ユーザー情報取得（無ければSupabase Authから同期して作成）
    let user = ensure_user_profile(&state, &auth_user, &token).await?;

    // 配送先住所取得（本人トークンでRLSを通す）
    let shipping_address = user_repo
        .find_address(auth_user.id, req.shipping_address_id)
        .await?
        .ok_or_else(|| AppError::NotFound("配送先住所が見つかりません".to_string()))?;

    // 請求先住所取得（指定がなければ配送先と同じ）
    let billing_address = if let Some(billing_id) = req.billing_address_id {
        Some(
            user_repo
                .find_address(auth_user.id, billing_id)
                .await?
                .ok_or_else(|| AppError::NotFound("請求先住所が見つかりません".to_string()))?,
        )
    } else {
        None
    };

    // 在庫確認と注文アイテム作成（N+1問題回避：一括取得）
    let product_ids: Vec<_> = source_items.iter().map(|i| i.product_id).collect();
    let products = product_repo.find_by_ids(&product_ids).await?;

    let mut order_items = Vec::new();
    let mut subtotal = 0i64;
    let mut stock_reserve_items: Vec<(Uuid, i32)> = Vec::new();

    for item_req in &source_items {
        let product = products
            .get(&item_req.product_id)
            .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

        if !product.is_active {
            return Err(AppError::BadRequest(format!(
                "「{}」は現在販売されていません",
                product.name
            )));
        }

        if product.stock < item_req.quantity {
            return Err(AppError::BadRequest(format!(
                "「{}」の在庫が不足しています",
                product.name
            )));
        }

        // 価格は常にサーバー側の最新の商品価格を採用（クライアント/カートの価格は信頼しない）
        let item_price = product.price;
        let item_subtotal = item_price * item_req.quantity as i64;
        subtotal += item_subtotal;

        order_items.push(OrderItem {
            product_id: product.id,
            product_name: product.name.clone(),
            product_sku: product.sku.clone(),
            price: item_price,
            quantity: item_req.quantity,
            subtotal: item_subtotal,
            image_url: product.images.first().cloned(),
        });

        stock_reserve_items.push((product.id, item_req.quantity));
    }

    // 金額計算
    let shipping_fee = calculate_shipping_fee(subtotal);
    let tax = calculate_tax(subtotal);
    let total = subtotal + shipping_fee + tax;

    let now = Utc::now();

    // 注文作成
    let order = Order {
        id: Uuid::new_v4(),
        user_id: Some(auth_user.id),
        order_number: generate_order_number(),
        status: OrderStatus::PendingPayment,
        items: order_items,
        subtotal,
        shipping_fee,
        tax,
        total,
        currency: "JPY".to_string(),
        shipping_address: OrderAddress::from_address(&shipping_address, user.name.clone()),
        billing_address: billing_address
            .map(|addr| OrderAddress::from_address(&addr, user.name.clone())),
        payment_method: req.payment_method,
        payment_status: PaymentStatus::Pending,
        payment_id: None,
        notes: req.notes,
        created_at: now,
        updated_at: now,
        shipped_at: None,
        delivered_at: None,
        // 認証済みユーザーの注文はゲスト注文ではない
        is_guest_order: false,
        guest_email: None,
        guest_name: None,
        guest_phone: None,
        guest_access_token_hash: None,
        guest_token_expires_at: None,
    };

    // 在庫を原子的に確保（同時購入で在庫マイナスになるのを防ぐ）
    let reserved = product_repo.reserve_stock_bulk(&stock_reserve_items).await?;
    if !reserved {
        return Err(AppError::BadRequest("在庫が不足しています".to_string()));
    }

    // 注文作成（失敗したら在庫を戻す）
    if let Err(e) = order_repo.create(&order).await {
        let _ = product_repo.release_stock_bulk(&stock_reserve_items).await;
        return Err(e);
    }

    // カートから注文した場合のみクリア（リクエストボディのitemsを使った場合はクリアしない）
    if req.items.is_none() {
        cart_repo.clear(&session_id).await?;
    }

    Ok(Json(DataResponse::new(order)))
}

/// 注文履歴取得
pub async fn list_orders(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
) -> Result<Json<PaginatedResponse<OrderSummary>>> {
    let order_repo = OrderRepository::new(state.db.with_auth(&token));

    let orders = order_repo.find_by_user(auth_user.id, 50).await?;
    let total = orders.len() as i64;

    Ok(Json(PaginatedResponse::new(orders, 1, 50, total)))
}

/// 注文詳細取得
pub async fn get_order(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    Path(id): Path<Uuid>,
) -> Result<Json<DataResponse<Order>>> {
    let order_repo = OrderRepository::new(state.db.with_auth(&token));
    let mut order = order_repo
        .find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

    // 自分の注文かチェック
    if order.user_id != Some(auth_user.id) {
        return Err(AppError::Forbidden("この注文にアクセスする権限がありません".to_string()));
    }

    // ---- Webhook不達/遅延のリカバリ ----
    // Pendingの注文は、PaymentIntentをStripeから取得して最終状態を同期する（URL直叩き/フロント判定依存を避ける）
    let is_pending = order.status == OrderStatus::PendingPayment
        && (order.payment_status == PaymentStatus::Pending || order.payment_status == PaymentStatus::Succeeded);
    if is_pending {
        if let Some(payment_id) = order.payment_id.clone() {
            if let Ok(stripe_key) = std::env::var("STRIPE_SECRET_KEY") {
                let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();
                let webhook_secrets = std::env::var("STRIPE_WEBHOOK_SECRETS").ok();
                let payment_provider = StripePaymentProvider::new(stripe_key, webhook_secret, webhook_secrets);

                if let Ok(pi) = payment_provider.retrieve_intent(&payment_id).await {
                    // anon + RPC関数で更新（service_roleを使わない）
                    let reconcile_order_repo = OrderRepository::new(state.db.anonymous());
                    // 在庫操作はRPCベースなのでservice_role
                    let product_repo = ProductRepository::new(state.db.service());

                    match pi.status {
                        crate::services::payment::PaymentResultStatus::Succeeded => {
                            // Stripe側金額/通貨を再検証（乖離は返金&キャンセル）
                            if pi.amount != order.total || pi.currency != order.currency.to_uppercase() {
                                tracing::error!(
                                    "Stripe/DB金額乖離検知(reconcile): order_id={}, payment_id={}, stripe_amount={}, db_total={}, stripe_currency={}, db_currency={}",
                                    order.id,
                                    payment_id,
                                    pi.amount,
                                    order.total,
                                    pi.currency,
                                    order.currency
                                );

                                // 返金は非同期で
                                let refund_provider = payment_provider.clone();
                                let pid = payment_id.clone();
                                tokio::spawn(async move {
                                    let _ = refund_provider.refund(&pid, None).await;
                                });

                                // RPC関数で更新（ステータス遷移チェック付き）
                                let updated = reconcile_order_repo
                                    .update_order_from_webhook_rpc(order.id, None, Some("cancelled"), Some("\"failed\""))
                                    .await
                                    .unwrap_or(false);
                                if updated {
                                    // 在庫復旧
                                    let release_items: Vec<(Uuid, i32)> =
                                        order.items.iter().map(|i| (i.product_id, i.quantity)).collect();
                                    let _ = product_repo.release_stock_bulk(&release_items).await;
                                }
                            } else {
                                // 正常確定（RPC関数で更新）
                                let _ = reconcile_order_repo
                                    .update_order_from_webhook_rpc(order.id, None, Some("paid"), Some("\"paid\""))
                                    .await;
                            }
                        }
                        crate::services::payment::PaymentResultStatus::Failed => {
                            // 失敗確定 -> キャンセル + 在庫復旧（RPC関数で更新）
                            let updated = reconcile_order_repo
                                .update_order_from_webhook_rpc(order.id, None, Some("cancelled"), Some("\"failed\""))
                                .await
                                .unwrap_or(false);
                            if updated {
                                let release_items: Vec<(Uuid, i32)> =
                                    order.items.iter().map(|i| (i.product_id, i.quantity)).collect();
                                let _ = product_repo.release_stock_bulk(&release_items).await;
                            }
                        }
                        crate::services::payment::PaymentResultStatus::Pending => {
                            // まだ処理中：何もしない
                        }
                    }
                }
            }
        }

        // 更新が入った可能性があるため再取得
        if let Some(updated) = order_repo.find_by_id(id).await? {
            order = updated;
        }
    }

    Ok(Json(DataResponse::new(order)))
}

/// 注文キャンセル
pub async fn cancel_order(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    Path(id): Path<Uuid>,
) -> Result<Json<DataResponse<Order>>> {
    let db = state.db.with_auth(&token);
    let order_repo = OrderRepository::new(db.clone());
    // 在庫操作は service_role のRPCでのみ許可（クライアント直叩き防止）
    let product_repo = ProductRepository::new(state.db.service());

    let order = order_repo
        .find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

    // 自分の注文かチェック
    if order.user_id != Some(auth_user.id) {
        return Err(AppError::Forbidden("この注文にアクセスする権限がありません".to_string()));
    }

    // キャンセル可能かチェック（支払い前のみ。支払い後のキャンセル/返金は管理者フローで行う）
    if order.status != OrderStatus::PendingPayment {
        return Err(AppError::BadRequest("この注文はキャンセルできません".to_string()));
    }

    // ステータス更新
    // 競合（Webhook/回収タスク等）で二重在庫戻しにならないよう条件付き更新にする
    let updated = order_repo
        .update_status_if_current(id, OrderStatus::PendingPayment, OrderStatus::Cancelled)
        .await?;
    if !updated {
        let updated_order = order_repo.find_by_id(id).await?.unwrap();
        return Ok(Json(DataResponse::new(updated_order)));
    }

    // 在庫を戻す（原子操作）
    let release_items: Vec<(Uuid, i32)> = order.items.iter().map(|i| (i.product_id, i.quantity)).collect();
    let _ = product_repo.release_stock_bulk(&release_items).await?;

    // 更新後の注文を取得
    let updated_order = order_repo.find_by_id(id).await?.unwrap();

    Ok(Json(DataResponse::new(updated_order)))
}

// ========== 管理者専用エンドポイント ==========

/// 全注文一覧取得（管理者専用）
/// RLSポリシーで管理者のみ全注文閲覧可能
pub async fn list_orders_admin(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
) -> Result<Json<DataResponse<Vec<OrderSummary>>>> {
    let order_repo = OrderRepository::new(state.db.with_auth(&token));

    let orders = order_repo.find_all(100).await?;

    Ok(Json(DataResponse::new(orders)))
}

/// 注文詳細取得（管理者専用）
/// RLSポリシーで管理者のみ閲覧可能
pub async fn get_order_admin(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Path(id): Path<Uuid>,
) -> Result<Json<DataResponse<Order>>> {
    let order_repo = OrderRepository::new(state.db.with_auth(&token));

    let order = order_repo
        .find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

    Ok(Json(DataResponse::new(order)))
}

/// ステータス更新リクエスト
#[derive(Debug, serde::Deserialize)]
pub struct UpdateOrderStatusRequest {
    pub status: String,
}

/// 注文ステータス更新（管理者専用）
/// RLSポリシーで管理者のみ更新可能
pub async fn update_order_status_admin(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateOrderStatusRequest>,
) -> Result<Json<DataResponse<Order>>> {
    let order_repo = OrderRepository::new(state.db.with_auth(&token));

    // 注文を取得
    let order = order_repo
        .find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

    // ステータスをパース
    let new_status: OrderStatus = req.status.parse()
        .map_err(|_| AppError::BadRequest("無効なステータスです".to_string()))?;

    // ステータス遷移のバリデーション
    validate_status_transition(&order.status, &new_status)?;

    // ステータス更新
    order_repo.update_status(id, order.user_id, new_status.clone(), order.created_at.timestamp()).await?;

    // 発送・配達日時の更新
    if new_status == OrderStatus::Shipped && order.shipped_at.is_none() {
        order_repo.update_shipped_at(id).await?;
    }
    if new_status == OrderStatus::Delivered && order.delivered_at.is_none() {
        order_repo.update_delivered_at(id).await?;
    }

    // 更新後の注文を取得
    let updated_order = order_repo
        .find_by_id(id)
        .await?
        .ok_or_else(|| AppError::Internal("注文の再取得に失敗しました".to_string()))?;

    Ok(Json(DataResponse::new(updated_order)))
}

/// ステータス遷移のバリデーション
fn validate_status_transition(current: &OrderStatus, next: &OrderStatus) -> Result<()> {
    use OrderStatus::*;

    // 許可される遷移を定義
    let valid = match current {
        PendingPayment => matches!(next, Paid | Cancelled),
        Paid => matches!(next, Processing | Cancelled | Refunded),
        Processing => matches!(next, Shipped | Cancelled | Refunded),
        Shipped => matches!(next, Delivered | Refunded),
        Delivered => matches!(next, Refunded),
        Cancelled | Refunded => false, // 終了状態からは遷移不可
    };

    if valid {
        Ok(())
    } else {
        Err(AppError::BadRequest(format!(
            "{}から{}への遷移はできません",
            current, next
        )))
    }
}

// ========== ゲスト注文エンドポイント ==========

/// ゲスト注文作成レスポンス
#[derive(Debug, serde::Serialize)]
pub struct CreateGuestOrderResponse {
    pub order: Order,
    pub guest_access_token: String,
}

/// ゲスト注文作成（認証不要）
pub async fn create_guest_order(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<CreateGuestOrderRequest>,
) -> Result<Json<DataResponse<CreateGuestOrderResponse>>> {
    req.validate()?;

    let session_id = headers
        .get("X-Session-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(generate_session_id);

    // ゲスト注文はRPC関数（SECURITY DEFINER）で作成
    // RPC関数がRLSをバイパスし、かつanon keyで呼び出せる
    let db_anon = state.db.anonymous();
    let db_service = state.db.service();
    let cart_repo = CartRepository::new(db_service.clone());
    let product_repo = ProductRepository::new(db_service.clone());
    let order_repo = OrderRepository::new(db_anon);

    // リクエストボディのitemsを優先的に使用、なければカートから取得
    let source_items = if let Some(ref items) = req.items {
        if items.is_empty() {
            return Err(AppError::BadRequest("注文アイテムが指定されていません".to_string()));
        }
        for item in items {
            item.validate()?;
        }
        items.clone()
    } else {
        // カートから取得
        let cart = cart_repo.find_by_session(&session_id).await?;
        if cart.items.is_empty() {
            return Err(AppError::BadRequest("カートが空です".to_string()));
        }
        cart.items
            .iter()
            .map(|item| crate::models::OrderItemRequest {
                product_id: item.product_id,
                quantity: item.quantity,
            })
            .collect()
    };

    // 在庫確認と注文アイテム作成
    let product_ids: Vec<_> = source_items.iter().map(|i| i.product_id).collect();
    let products = product_repo.find_by_ids(&product_ids).await?;

    let mut order_items = Vec::new();
    let mut subtotal = 0i64;
    let mut stock_reserve_items: Vec<(Uuid, i32)> = Vec::new();

    for item_req in &source_items {
        let product = products
            .get(&item_req.product_id)
            .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

        if !product.is_active {
            return Err(AppError::BadRequest(format!(
                "「{}」は現在販売されていません",
                product.name
            )));
        }

        if product.stock < item_req.quantity {
            return Err(AppError::BadRequest(format!(
                "「{}」の在庫が不足しています",
                product.name
            )));
        }

        let item_price = product.price;
        let item_subtotal = item_price * item_req.quantity as i64;
        subtotal += item_subtotal;

        order_items.push(OrderItem {
            product_id: product.id,
            product_name: product.name.clone(),
            product_sku: product.sku.clone(),
            price: item_price,
            quantity: item_req.quantity,
            subtotal: item_subtotal,
            image_url: product.images.first().cloned(),
        });

        stock_reserve_items.push((product.id, item_req.quantity));
    }

    // 金額計算
    let shipping_fee = calculate_shipping_fee(subtotal);
    let tax = calculate_tax(subtotal);
    let total = subtotal + shipping_fee + tax;

    let now = Utc::now();

    // ゲストアクセストークン生成
    let (guest_access_token, guest_access_token_hash) = generate_guest_access_token();
    let guest_token_expires = guest_token_expiry();

    // 配送先住所を変換
    let shipping_address = req.shipping_address.to_order_address();
    let billing_address = req.billing_address.as_ref().map(|addr| addr.to_order_address());

    // ゲスト注文作成
    let order = Order {
        id: Uuid::new_v4(),
        user_id: None, // ゲスト注文なのでuser_idはNULL
        order_number: generate_order_number(),
        status: OrderStatus::PendingPayment,
        items: order_items,
        subtotal,
        shipping_fee,
        tax,
        total,
        currency: "JPY".to_string(),
        shipping_address,
        billing_address,
        payment_method: req.payment_method,
        payment_status: PaymentStatus::Pending,
        payment_id: None,
        notes: req.notes,
        created_at: now,
        updated_at: now,
        shipped_at: None,
        delivered_at: None,
        // ゲスト注文フィールド
        is_guest_order: true,
        guest_email: req.email.clone(),
        guest_name: Some(req.shipping_address.name.clone()),
        guest_phone: Some(req.shipping_address.phone.clone()),
        guest_access_token_hash: Some(guest_access_token_hash),
        guest_token_expires_at: Some(guest_token_expires),
    };

    // 在庫を原子的に確保
    let reserved = product_repo.reserve_stock_bulk(&stock_reserve_items).await?;
    if !reserved {
        return Err(AppError::BadRequest("在庫が不足しています".to_string()));
    }

    // 注文とアイテムを同時作成（RPC関数を使用、失敗したら在庫を戻す）
    let created_order = match order_repo.create_guest_order_rpc(&order).await {
        Ok(o) => o,
        Err(e) => {
            let _ = product_repo.release_stock_bulk(&stock_reserve_items).await;
            return Err(e);
        }
    };

    // カートから注文した場合のみクリア
    if req.items.is_none() {
        cart_repo.clear(&session_id).await?;
    }

    Ok(Json(DataResponse::new(CreateGuestOrderResponse {
        order: created_order,
        guest_access_token,
    })))
}

/// ゲスト注文取得パラメータ
#[derive(Debug, serde::Deserialize)]
pub struct GetGuestOrderParams {
    pub token: String,
}

/// ゲスト注文取得（認証不要、トークンで認可）
pub async fn get_guest_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    axum::extract::Query(params): axum::extract::Query<GetGuestOrderParams>,
) -> Result<Json<DataResponse<Order>>> {
    // トークンをハッシュ化
    let token_hash = hash_guest_token(&params.token);

    // anon key + RPC関数でゲスト注文を取得（SECURITY DEFINER関数がトークンを検証）
    let order_repo = OrderRepository::new(state.db.anonymous());
    let order = order_repo
        .find_by_guest_token_rpc(&token_hash, id)
        .await?
        .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

    Ok(Json(DataResponse::new(order)))
}
