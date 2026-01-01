use async_trait::async_trait;
use hmac::{Hmac, Mac};
use sha2::Sha256;

use super::provider::*;

/// Stripe決済プロバイダ
#[derive(Clone)]
pub struct StripePaymentProvider {
    api_key: String,
    /// 互換用（単一secret）
    webhook_secret: String,
    /// ローテーション用（カンマ区切りで複数指定）
    webhook_secrets: Vec<String>,
    client: reqwest::Client,
}

impl StripePaymentProvider {
    /// `webhook_secrets_csv` は `STRIPE_WEBHOOK_SECRETS` の値（カンマ区切り）を想定
    pub fn new(api_key: String, webhook_secret: String, webhook_secrets_csv: Option<String>) -> Self {
        let mut secrets: Vec<String> = vec![];
        if let Some(csv) = webhook_secrets_csv {
            secrets.extend(
                csv.split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
            );
        }
        // 後方互換: STRIPE_WEBHOOK_SECRET も候補に入れる
        if !webhook_secret.trim().is_empty() {
            secrets.push(webhook_secret.clone());
        }
        secrets.sort();
        secrets.dedup();
        Self {
            api_key,
            webhook_secret,
            webhook_secrets: secrets,
            client: reqwest::Client::new(),
        }
    }

    fn api_base_url(&self) -> &'static str {
        "https://api.stripe.com/v1"
    }

    /// PaymentIntent取得（Webhook不達時のリカバリ用）
    pub async fn retrieve_intent(&self, intent_id: &str) -> Result<PaymentResult, PaymentError> {
        let response = self
            .client
            .get(&format!("{}/payment_intents/{}", self.api_base_url(), intent_id))
            .basic_auth(&self.api_key, None::<&str>)
            .send()
            .await
            .map_err(|e| PaymentError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            // セキュリティ: エラー詳細はログのみ、ユーザーには汎用メッセージ
            tracing::warn!("Stripe API error (retrieve_intent): {}", error_text);
            return Err(PaymentError::ProviderError(
                "Payment retrieval failed. Please try again.".to_string()
            ));
        }

        let stripe_response: serde_json::Value = response
            .json()
            .await
            .map_err(|e| PaymentError::ProviderError(e.to_string()))?;

        let status = match stripe_response["status"].as_str() {
            Some("succeeded") => PaymentResultStatus::Succeeded,
            Some("processing") => PaymentResultStatus::Pending,
            Some("canceled") => PaymentResultStatus::Failed,
            // requires_* はまだ完了していない扱い
            Some("requires_payment_method")
            | Some("requires_confirmation")
            | Some("requires_action") => PaymentResultStatus::Pending,
            _ => PaymentResultStatus::Failed,
        };

        Ok(PaymentResult {
            id: intent_id.to_string(),
            status,
            amount: stripe_response["amount"].as_i64().unwrap_or(0),
            currency: stripe_response["currency"]
                .as_str()
                .unwrap_or("jpy")
                .to_uppercase(),
            // retrieveは確定時刻が不明なためpaid_atは入れない（必要ならchargesで取得する）
            paid_at: None,
        })
    }
}

#[async_trait]
impl PaymentProvider for StripePaymentProvider {
    async fn create_intent(&self, params: CreateIntentParams) -> Result<PaymentIntent, PaymentError> {
        let mut form: Vec<(String, String)> = vec![
            ("amount".to_string(), params.amount.to_string()),
            ("currency".to_string(), params.currency.to_lowercase()),
            ("receipt_email".to_string(), params.customer_email.clone()),
        ];

        if let Some(desc) = params.description {
            form.push(("description".to_string(), desc));
        }

        // メタデータ追加
        form.push(("metadata[order_id]".to_string(), params.order_id.to_string()));
        
        // 追加のメタデータを追加
        if let Some(metadata) = params.metadata {
            for (key, value) in metadata {
                let metadata_key = format!("metadata[{}]", key);
                form.push((metadata_key, value));
            }
        }

        // 配送先住所情報を追加（Stripe側にも保存）
        if let Some(shipping) = params.shipping_address {
            // 配送先住所をStripeの形式に変換
            form.push(("shipping[name]".to_string(), shipping.name));
            form.push(("shipping[address][line1]".to_string(), shipping.address_line1));
            if let Some(line2) = shipping.address_line2 {
                form.push(("shipping[address][line2]".to_string(), line2));
            }
            form.push(("shipping[address][city]".to_string(), shipping.city));
            form.push(("shipping[address][state]".to_string(), shipping.prefecture));
            form.push(("shipping[address][postal_code]".to_string(), shipping.postal_code));
            form.push(("shipping[address][country]".to_string(), "JP".to_string()));
            if let Some(phone) = shipping.phone {
                form.push(("shipping[phone]".to_string(), phone));
            }
        }

        let response = self
            .client
            .post(&format!("{}/payment_intents", self.api_base_url()))
            .basic_auth(&self.api_key, None::<&str>)
            // 冪等性キー（同一注文の多重生成防止）
            .header(
                "Idempotency-Key",
                params.idempotency_key.clone().unwrap_or_else(|| format!("pi_order_{}", params.order_id)),
            )
            .form(&form)
            .send()
            .await
            .map_err(|e| PaymentError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            // セキュリティ: エラー詳細はログのみ、ユーザーには汎用メッセージ
            tracing::warn!("Stripe API error (create_intent): {}", error_text);
            return Err(PaymentError::ProviderError(
                "Payment initialization failed. Please try again.".to_string()
            ));
        }

        let stripe_response: serde_json::Value = response
            .json()
            .await
            .map_err(|e| PaymentError::ProviderError(e.to_string()))?;

        Ok(PaymentIntent {
            id: stripe_response["id"]
                .as_str()
                .ok_or_else(|| PaymentError::ProviderError("Missing id".to_string()))?
                .to_string(),
            client_secret: stripe_response["client_secret"]
                .as_str()
                .ok_or_else(|| PaymentError::ProviderError("Missing client_secret".to_string()))?
                .to_string(),
            amount: params.amount,
            currency: params.currency,
            status: PaymentIntentStatus::RequiresPaymentMethod,
        })
    }

    async fn confirm(&self, intent_id: &str) -> Result<PaymentResult, PaymentError> {
        let response = self
            .client
            .post(&format!(
                "{}/payment_intents/{}/confirm",
                self.api_base_url(),
                intent_id
            ))
            .basic_auth(&self.api_key, None::<&str>)
            .send()
            .await
            .map_err(|e| PaymentError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            // セキュリティ: エラー詳細はログのみ、ユーザーには汎用メッセージ
            tracing::warn!("Stripe API error (confirm): {}", error_text);
            return Err(PaymentError::ProviderError(
                "Payment confirmation failed. Please try again.".to_string()
            ));
        }

        let stripe_response: serde_json::Value = response
            .json()
            .await
            .map_err(|e| PaymentError::ProviderError(e.to_string()))?;

        let status = match stripe_response["status"].as_str() {
            Some("succeeded") => PaymentResultStatus::Succeeded,
            Some("processing") => PaymentResultStatus::Pending,
            _ => PaymentResultStatus::Failed,
        };

        Ok(PaymentResult {
            id: intent_id.to_string(),
            status,
            amount: stripe_response["amount"].as_i64().unwrap_or(0),
            currency: stripe_response["currency"]
                .as_str()
                .unwrap_or("jpy")
                .to_uppercase(),
            paid_at: if status == PaymentResultStatus::Succeeded {
                Some(chrono::Utc::now())
            } else {
                None
            },
        })
    }

    async fn refund(&self, payment_id: &str, amount: Option<i64>) -> Result<RefundResult, PaymentError> {
        let mut form = vec![("payment_intent", payment_id.to_string())];

        if let Some(amt) = amount {
            form.push(("amount", amt.to_string()));
        }

        let response = self
            .client
            .post(&format!("{}/refunds", self.api_base_url()))
            .basic_auth(&self.api_key, None::<&str>)
            .form(&form)
            .send()
            .await
            .map_err(|e| PaymentError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            // セキュリティ: エラー詳細はログのみ、ユーザーには汎用メッセージ
            tracing::warn!("Stripe API error (refund): {}", error_text);
            return Err(PaymentError::ProviderError(
                "Refund processing failed. Please try again.".to_string()
            ));
        }

        let stripe_response: serde_json::Value = response
            .json()
            .await
            .map_err(|e| PaymentError::ProviderError(e.to_string()))?;

        let status = match stripe_response["status"].as_str() {
            Some("succeeded") => RefundStatus::Succeeded,
            Some("pending") => RefundStatus::Pending,
            _ => RefundStatus::Failed,
        };

        Ok(RefundResult {
            id: stripe_response["id"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            payment_id: payment_id.to_string(),
            amount: stripe_response["amount"].as_i64().unwrap_or(0),
            status,
            created_at: chrono::Utc::now(),
        })
    }

    fn verify_webhook(&self, payload: &[u8], signature: &str) -> Result<WebhookEvent, PaymentError> {
        // Stripe署名検証
        // 署名形式: t=timestamp,v1=signature[,v1=signature2...]
        let mut timestamp: Option<i64> = None;
        let mut sigs_v1: Vec<String> = vec![];
        for part in signature.split(',') {
            let mut iter = part.splitn(2, '=');
            let k = iter.next().unwrap_or("").trim();
            let v = iter.next().unwrap_or("").trim();
            if k == "t" {
                timestamp = v.parse::<i64>().ok();
            } else if k == "v1" && !v.is_empty() {
                sigs_v1.push(v.to_string());
            }
        }
        let timestamp = timestamp.ok_or_else(|| {
            PaymentError::WebhookVerificationFailed("Missing timestamp".to_string())
        })?;
        if sigs_v1.is_empty() {
            return Err(PaymentError::WebhookVerificationFailed("Missing v1 signature".to_string()));
        }

        // リプレイ対策: タイムスタンプ許容範囲
        // 本番環境では120秒以下を強制（リプレイ攻撃対策）
        let env = std::env::var("ENVIRONMENT").unwrap_or_else(|_| "production".to_string());
        let is_prod = env == "production";
        let default_tolerance: i64 = if is_prod { 120 } else { 300 };

        let mut tolerance: i64 = std::env::var("STRIPE_WEBHOOK_TOLERANCE_SECONDS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(default_tolerance);

        // 本番環境では120秒を超える設定を許可しない
        if is_prod && tolerance > 120 {
            tracing::warn!(
                "STRIPE_WEBHOOK_TOLERANCE_SECONDS={} exceeds 120s limit for production, capping to 120s",
                tolerance
            );
            tolerance = 120;
        }

        let now = chrono::Utc::now().timestamp();
        if (now - timestamp).abs() > tolerance {
            return Err(PaymentError::WebhookVerificationFailed(
                format!("Timestamp out of tolerance ({}s)", tolerance)
            ));
        }

        // signed_payload = "{t}.{raw_payload}"
        let mut signed_payload: Vec<u8> = Vec::with_capacity(32 + payload.len());
        signed_payload.extend_from_slice(timestamp.to_string().as_bytes());
        signed_payload.push(b'.');
        signed_payload.extend_from_slice(payload);

        // いずれかのsecretで一致すればOK（ローテーション対応）
        fn ct_eq(a: &[u8], b: &[u8]) -> bool {
            if a.len() != b.len() {
                return false;
            }
            let mut diff: u8 = 0;
            for (x, y) in a.iter().zip(b.iter()) {
                diff |= x ^ y;
            }
            diff == 0
        }

        let mut verified = false;
        for secret in self.webhook_secrets.iter() {
            type HmacSha256 = Hmac<Sha256>;
            let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
                .map_err(|_| PaymentError::WebhookVerificationFailed("Invalid secret".to_string()))?;
            mac.update(&signed_payload);
            let expected = mac.finalize().into_bytes();

            for sig_hex in sigs_v1.iter() {
                if let Ok(sig_bytes) = hex::decode(sig_hex) {
                    if ct_eq(expected.as_slice(), sig_bytes.as_slice()) {
                        verified = true;
                        break;
                    }
                }
            }
            if verified {
                break;
            }
        }

        if !verified {
            return Err(PaymentError::WebhookVerificationFailed("Signature mismatch".to_string()));
        }

        // イベントをパース
        let event: serde_json::Value = serde_json::from_slice(payload)
            .map_err(|e| PaymentError::WebhookVerificationFailed(e.to_string()))?;

        let event_type = match event["type"].as_str() {
            Some("payment_intent.succeeded") => WebhookEventType::PaymentSucceeded,
            Some("payment_intent.payment_failed") => WebhookEventType::PaymentFailed,
            Some("charge.refunded") => WebhookEventType::RefundSucceeded,
            _ => WebhookEventType::Unknown,
        };

        let event_id = event["id"]
            .as_str()
            .unwrap_or("")
            .to_string();
        if event_id.is_empty() {
            return Err(PaymentError::WebhookVerificationFailed("Missing event id".to_string()));
        }

        let payment_id = event["data"]["object"]["id"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let order_id = event["data"]["object"]["metadata"]["order_id"]
            .as_str()
            .and_then(|s| s.parse().ok());

        Ok(WebhookEvent {
            event_id,
            event_type,
            payment_id,
            order_id,
            data: event,
        })
    }

    fn name(&self) -> &'static str {
        "stripe"
    }
}
