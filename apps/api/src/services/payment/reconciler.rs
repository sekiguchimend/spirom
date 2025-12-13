use std::time::Duration;

use chrono::Utc;

use crate::config::AppState;
use crate::db::repositories::{OrderRepository, ProductRepository};
use crate::models::{OrderStatus, PaymentStatus};

use super::{PaymentProvider, PaymentResultStatus, StripePaymentProvider};

fn env_i64(name: &str, default: i64) -> i64 {
    std::env::var(name).ok().and_then(|s| s.parse().ok()).unwrap_or(default)
}

fn env_i32(name: &str, default: i32) -> i32 {
    std::env::var(name).ok().and_then(|s| s.parse().ok()).unwrap_or(default)
}

/// Webhook不達/遅延に備えた「決済状態の回収」タスクを起動する
/// - pending の注文を一定間隔で照合して、Paid/Cancelled を自動反映する
/// - 在庫戻しは `update_status_if_current` で競合時の二重実行を防ぐ
pub fn spawn_payment_reconciler(state: AppState) {
    let interval_seconds = env_i64("PAYMENT_RECONCILE_INTERVAL_SECONDS", 60).max(10);
    let min_age_seconds = env_i64("PAYMENT_RECONCILE_MIN_AGE_SECONDS", 30).max(0);
    let batch_size = env_i32("PAYMENT_RECONCILE_BATCH_SIZE", 50).clamp(1, 200);
    let max_age_seconds = env_i64("PAYMENT_INTENT_MAX_AGE_SECONDS", 1800).max(60);

    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(Duration::from_secs(interval_seconds as u64));
        loop {
            ticker.tick().await;

            let stripe_key = match std::env::var("STRIPE_SECRET_KEY") {
                Ok(v) if !v.trim().is_empty() => v,
                _ => continue, // Stripe未設定環境では何もしない
            };
            let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();
            let webhook_secrets = std::env::var("STRIPE_WEBHOOK_SECRETS").ok();
            let provider = StripePaymentProvider::new(stripe_key, webhook_secret, webhook_secrets);

            let db = state.db.service();
            let order_repo = OrderRepository::new(db.clone());
            let product_repo = ProductRepository::new(db);

            let created_before = Utc::now() - chrono::Duration::seconds(min_age_seconds);
            let candidates = match order_repo
                .find_pending_payment_for_reconcile(created_before, batch_size)
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    tracing::warn!("payment reconciler: failed to list orders: {}", e);
                    continue;
                }
            };

            for row in candidates {
                let age_seconds = (Utc::now() - row.created_at).num_seconds();

                // 1) PaymentIntent未作成で期限切れ：自動キャンセル + 在庫解放
                if row.payment_id.is_none() && age_seconds > max_age_seconds {
                    if let Ok(Some(order)) = order_repo.find_by_id(row.id).await {
                        let updated = match order_repo
                            .update_status_if_current(order.id, OrderStatus::PendingPayment, OrderStatus::Cancelled)
                            .await
                        {
                            Ok(v) => v,
                            Err(e) => {
                                tracing::warn!("payment reconciler: cancel status update failed: {}", e);
                                continue;
                            }
                        };
                        if updated {
                            let _ = order_repo.update_payment_status(order.id, PaymentStatus::Failed).await;
                            let release_items: Vec<(uuid::Uuid, i32)> =
                                order.items.iter().map(|i| (i.product_id, i.quantity)).collect();
                            let _ = product_repo.release_stock_bulk(&release_items).await;
                            tracing::info!("payment reconciler: cancelled expired order (no intent): {}", order.id);
                        }
                    }
                    continue;
                }

                // 2) PaymentIntentがある：Stripeで最終状態を照合して同期
                let Some(payment_id) = row.payment_id.clone() else { continue };

                let order = match order_repo.find_by_id(row.id).await {
                    Ok(Some(o)) => o,
                    _ => continue,
                };
                if order.status != OrderStatus::PendingPayment {
                    continue;
                }

                let pi = match provider.retrieve_intent(&payment_id).await {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::warn!("payment reconciler: retrieve intent failed: order_id={}, err={}", row.id, e);
                        continue;
                    }
                };

                match pi.status {
                    PaymentResultStatus::Succeeded => {
                        // 金額/通貨再検証（乖離は返金→キャンセル）
                        if pi.amount != order.total || pi.currency != order.currency.to_uppercase() {
                            tracing::error!(
                                "payment reconciler: Stripe/DB mismatch: order_id={}, payment_id={}, stripe_amount={}, db_total={}, stripe_currency={}, db_currency={}",
                                order.id,
                                payment_id,
                                pi.amount,
                                order.total,
                                pi.currency,
                                order.currency
                            );

                            // 返金は非同期（タスク自体の遅延を防ぐ）
                            let refund_provider = provider.clone();
                            let pid = payment_id.clone();
                            tokio::spawn(async move {
                                let _ = refund_provider.refund(&pid, None).await;
                            });

                            let updated = order_repo
                                .update_status_if_current(order.id, OrderStatus::PendingPayment, OrderStatus::Cancelled)
                                .await
                                .unwrap_or(false);
                            if updated {
                                let _ = order_repo.update_payment_status(order.id, PaymentStatus::Failed).await;
                                let release_items: Vec<(uuid::Uuid, i32)> =
                                    order.items.iter().map(|i| (i.product_id, i.quantity)).collect();
                                let _ = product_repo.release_stock_bulk(&release_items).await;
                            }
                        } else {
                            let updated = order_repo
                                .update_status_if_current(order.id, OrderStatus::PendingPayment, OrderStatus::Paid)
                                .await
                                .unwrap_or(false);
                            if updated {
                                let _ = order_repo.update_payment_status(order.id, PaymentStatus::Paid).await;
                                tracing::info!("payment reconciler: marked paid: {}", order.id);
                            }
                        }
                    }
                    PaymentResultStatus::Failed => {
                        let updated = order_repo
                            .update_status_if_current(order.id, OrderStatus::PendingPayment, OrderStatus::Cancelled)
                            .await
                            .unwrap_or(false);
                        if updated {
                            let _ = order_repo.update_payment_status(order.id, PaymentStatus::Failed).await;
                            let release_items: Vec<(uuid::Uuid, i32)> =
                                order.items.iter().map(|i| (i.product_id, i.quantity)).collect();
                            let _ = product_repo.release_stock_bulk(&release_items).await;
                            tracing::info!("payment reconciler: cancelled failed intent: {}", order.id);
                        }
                    }
                    PaymentResultStatus::Pending => {
                        // 期限超過ならキャンセル（在庫をいつまでも抱えない）
                        if age_seconds > max_age_seconds {
                            let updated = order_repo
                                .update_status_if_current(order.id, OrderStatus::PendingPayment, OrderStatus::Cancelled)
                                .await
                                .unwrap_or(false);
                            if updated {
                                let _ = order_repo.update_payment_status(order.id, PaymentStatus::Failed).await;
                                let release_items: Vec<(uuid::Uuid, i32)> =
                                    order.items.iter().map(|i| (i.product_id, i.quantity)).collect();
                                let _ = product_repo.release_stock_bulk(&release_items).await;
                                tracing::info!("payment reconciler: cancelled timeout order: {}", order.id);
                            }
                        }
                    }
                }
            }
        }
    });
}


