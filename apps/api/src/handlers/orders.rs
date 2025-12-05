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
    AuthenticatedUser, CreateOrderRequest, DataResponse, Order, OrderAddress, OrderItem,
    OrderStatus, OrderSummary, PaginatedResponse, PaymentStatus,
    calculate_shipping_fee, calculate_tax, generate_order_number,
};

/// 注文作成
pub async fn create_order(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    headers: HeaderMap,
    Json(req): Json<CreateOrderRequest>,
) -> Result<Json<DataResponse<Order>>> {
    req.validate()?;

    let session_id = headers
        .get("X-Session-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(generate_session_id);

    let cart_repo = CartRepository::new(state.db.clone());
    let order_repo = OrderRepository::new(state.db.clone());
    let user_repo = UserRepository::new(state.db.clone());
    let product_repo = ProductRepository::new(state.db.clone());

    // カート取得
    let cart = cart_repo.find_by_session(&session_id).await?;

    if cart.items.is_empty() {
        return Err(AppError::BadRequest("カートが空です".to_string()));
    }

    // ユーザー情報取得
    let user = user_repo
        .find_by_id(auth_user.id)
        .await?
        .ok_or_else(|| AppError::NotFound("ユーザーが見つかりません".to_string()))?;

    // 配送先住所取得
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

    // 在庫確認と注文アイテム作成
    let mut order_items = Vec::new();
    for cart_item in &cart.items {
        let product = product_repo
            .find_by_id(cart_item.product_id)
            .await?
            .ok_or_else(|| AppError::NotFound("商品が見つかりません".to_string()))?;

        if product.stock < cart_item.quantity {
            return Err(AppError::BadRequest(format!(
                "「{}」の在庫が不足しています",
                product.name
            )));
        }

        order_items.push(OrderItem {
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            price: cart_item.price,
            quantity: cart_item.quantity,
            subtotal: cart_item.subtotal,
            image_url: cart_item.image_url.clone(),
        });
    }

    // 金額計算
    let subtotal = cart.subtotal;
    let shipping_fee = calculate_shipping_fee(subtotal);
    let tax = calculate_tax(subtotal);
    let total = subtotal + shipping_fee + tax;

    let now = Utc::now();

    // 注文作成
    let order = Order {
        id: Uuid::new_v4(),
        user_id: auth_user.id,
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
    };

    order_repo.create(&order).await?;

    // 在庫を減らす
    for item in &order.items {
        let product = product_repo.find_by_id(item.product_id).await?.unwrap();
        product_repo
            .update_stock(item.product_id, product.stock - item.quantity)
            .await?;
    }

    // カートをクリア
    cart_repo.clear(&session_id).await?;

    Ok(Json(DataResponse::new(order)))
}

/// 注文履歴取得
pub async fn list_orders(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
) -> Result<Json<PaginatedResponse<OrderSummary>>> {
    let order_repo = OrderRepository::new(state.db.clone());

    let orders = order_repo.find_by_user(auth_user.id, 50).await?;
    let total = orders.len() as i64;

    Ok(Json(PaginatedResponse::new(orders, 1, 50, total)))
}

/// 注文詳細取得
pub async fn get_order(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<DataResponse<Order>>> {
    let order_repo = OrderRepository::new(state.db.clone());

    let order = order_repo
        .find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

    // 自分の注文かチェック
    if order.user_id != auth_user.id {
        return Err(AppError::Forbidden("この注文にアクセスする権限がありません".to_string()));
    }

    Ok(Json(DataResponse::new(order)))
}

/// 注文キャンセル
pub async fn cancel_order(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<DataResponse<Order>>> {
    let order_repo = OrderRepository::new(state.db.clone());
    let product_repo = ProductRepository::new(state.db.clone());

    let order = order_repo
        .find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("注文が見つかりません".to_string()))?;

    // 自分の注文かチェック
    if order.user_id != auth_user.id {
        return Err(AppError::Forbidden("この注文にアクセスする権限がありません".to_string()));
    }

    // キャンセル可能かチェック
    if order.status != OrderStatus::PendingPayment && order.status != OrderStatus::Paid {
        return Err(AppError::BadRequest("この注文はキャンセルできません".to_string()));
    }

    // ステータス更新
    order_repo
        .update_status(
            id,
            auth_user.id,
            OrderStatus::Cancelled,
            order.created_at.timestamp_millis(),
        )
        .await?;

    // 在庫を戻す
    for item in &order.items {
        let product = product_repo.find_by_id(item.product_id).await?;
        if let Some(product) = product {
            product_repo
                .update_stock(item.product_id, product.stock + item.quantity)
                .await?;
        }
    }

    // 更新後の注文を取得
    let updated_order = order_repo.find_by_id(id).await?.unwrap();

    Ok(Json(DataResponse::new(updated_order)))
}
