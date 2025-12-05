use worker::*;
use crate::error::BffError;

pub struct RateLimiter {
    kv: kv::KvStore,
    window_size: u64,
    max_requests: u32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct RateLimitEntry {
    count: u32,
    window_start: i64,
}

impl RateLimiter {
    pub fn new(kv: kv::KvStore) -> Self {
        Self {
            kv,
            window_size: 60,
            max_requests: 100,
        }
    }

    pub fn with_limits(kv: kv::KvStore, window_size: u64, max_requests: u32) -> Self {
        Self {
            kv,
            window_size,
            max_requests,
        }
    }

    pub async fn check(&self, client_ip: &str) -> std::result::Result<RateLimitResult, BffError> {
        let key = format!("ratelimit:{}", client_ip);
        let now = chrono::Utc::now().timestamp();

        let entry = match self.kv.get(&key).text().await {
            Ok(Some(text)) => {
                serde_json::from_str::<RateLimitEntry>(&text)
                    .ok()
            }
            _ => None,
        };

        let (new_entry, allowed) = match entry {
            Some(mut e) if now - e.window_start < self.window_size as i64 => {
                e.count += 1;
                let allowed = e.count <= self.max_requests;
                (e, allowed)
            }
            _ => {
                let e = RateLimitEntry {
                    count: 1,
                    window_start: now,
                };
                (e, true)
            }
        };

        let json = serde_json::to_string(&new_entry)
            .map_err(|e| BffError::InternalError(e.to_string()))?;

        let _ = self.kv
            .put(&key, json)
            .map(|p| p.expiration_ttl(self.window_size * 2))
            .and_then(|p| {
                wasm_bindgen_futures::spawn_local(async move {
                    let _ = p.execute().await;
                });
                Ok(())
            });

        let remaining = if new_entry.count > self.max_requests {
            0
        } else {
            self.max_requests - new_entry.count
        };

        let reset_at = new_entry.window_start + self.window_size as i64;

        Ok(RateLimitResult {
            allowed,
            remaining,
            reset_at,
            limit: self.max_requests,
        })
    }

    pub fn add_headers(&self, response: Response, result: &RateLimitResult) -> Result<Response> {
        let mut headers = response.headers().clone();
        headers.set("X-RateLimit-Limit", &result.limit.to_string())?;
        headers.set("X-RateLimit-Remaining", &result.remaining.to_string())?;
        headers.set("X-RateLimit-Reset", &result.reset_at.to_string())?;

        Ok(response.with_headers(headers))
    }
}

#[derive(Debug, Clone)]
pub struct RateLimitResult {
    pub allowed: bool,
    pub remaining: u32,
    pub reset_at: i64,
    pub limit: u32,
}
