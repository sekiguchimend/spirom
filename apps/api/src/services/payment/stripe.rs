use async_trait::async_trait;
use hmac::{Hmac, Mac};
use sha2::Sha256;

use super::provider::*;

/// Stripe決済プロバイダ
pub struct StripePaymentProvider {
    api_key: String,
    webhook_secret: String,
    client: reqwest::Client,
}

impl StripePaymentProvider {
    pub fn new(api_key: String, webhook_secret: String) -> Self {
        Self {
            api_key,
            webhook_secret,
            client: reqwest::Client::new(),
        }
    }

    fn api_base_url(&self) -> &'static str {
        "https://api.stripe.com/v1"
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
            .form(&form)
            .send()
            .await
            .map_err(|e| PaymentError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(PaymentError::ProviderError(format!(
                "Stripe API error: {}",
                error_text
            )));
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
            return Err(PaymentError::ProviderError(format!(
                "Stripe API error: {}",
                error_text
            )));
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
            return Err(PaymentError::ProviderError(format!(
                "Stripe API error: {}",
                error_text
            )));
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
        // 署名形式: t=timestamp,v1=signature
        let parts: std::collections::HashMap<&str, &str> = signature
            .split(',')
            .filter_map(|part| {
                let mut iter = part.splitn(2, '=');
                Some((iter.next()?, iter.next()?))
            })
            .collect();

        let timestamp = parts
            .get("t")
            .ok_or_else(|| PaymentError::WebhookVerificationFailed("Missing timestamp".to_string()))?;

        let sig = parts
            .get("v1")
            .ok_or_else(|| PaymentError::WebhookVerificationFailed("Missing signature".to_string()))?;

        // 署名計算
        let signed_payload = format!("{}.{}", timestamp, String::from_utf8_lossy(payload));

        type HmacSha256 = Hmac<Sha256>;
        let mut mac = HmacSha256::new_from_slice(self.webhook_secret.as_bytes())
            .map_err(|_| PaymentError::WebhookVerificationFailed("Invalid secret".to_string()))?;
        mac.update(signed_payload.as_bytes());

        let expected_sig = hex::encode(mac.finalize().into_bytes());

        if expected_sig != *sig {
            return Err(PaymentError::WebhookVerificationFailed(
                "Signature mismatch".to_string(),
            ));
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

        let payment_id = event["data"]["object"]["id"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let order_id = event["data"]["object"]["metadata"]["order_id"]
            .as_str()
            .and_then(|s| s.parse().ok());

        Ok(WebhookEvent {
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
