use serde::{de::DeserializeOwned, Serialize};
use worker::*;
use crate::error::BffError;

pub struct CacheManager {
    kv: kv::KvStore,
}

#[derive(Debug, Clone)]
pub struct CacheOptions {
    pub ttl: u64,
    pub stale_ttl: Option<u64>,
}

impl Default for CacheOptions {
    fn default() -> Self {
        Self {
            ttl: 300,
            stale_ttl: Some(600),
        }
    }
}

impl CacheOptions {
    pub fn short() -> Self {
        Self {
            ttl: 30,
            stale_ttl: Some(60),
        }
    }

    pub fn medium() -> Self {
        Self {
            ttl: 300,
            stale_ttl: Some(600),
        }
    }

    pub fn long() -> Self {
        Self {
            ttl: 3600,
            stale_ttl: Some(7200),
        }
    }

    pub fn static_content() -> Self {
        Self {
            ttl: 86400,
            stale_ttl: Some(172800),
        }
    }
}

#[derive(Debug, Clone, Serialize, serde::Deserialize)]
struct CacheEntry<T> {
    data: T,
    created_at: i64,
    ttl: u64,
}

impl CacheManager {
    pub fn new(kv: kv::KvStore) -> Self {
        Self { kv }
    }

    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>> {
        match self.kv.get(key).text().await? {
            Some(text) => {
                let entry: CacheEntry<T> = serde_json::from_str(&text)
                    .map_err(|e| worker::Error::from(e.to_string()))?;
                Ok(Some(entry.data))
            }
            None => Ok(None),
        }
    }

    pub async fn set<T: Serialize>(&self, key: &str, value: &T, options: &CacheOptions) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        let entry = CacheEntry {
            data: value,
            created_at: now,
            ttl: options.ttl,
        };

        let json = serde_json::to_string(&entry)
            .map_err(|e| worker::Error::from(e.to_string()))?;

        self.kv
            .put(key, json)?
            .expiration_ttl(options.stale_ttl.unwrap_or(options.ttl))
            .execute()
            .await?;

        Ok(())
    }

    pub async fn delete(&self, key: &str) -> Result<()> {
        self.kv.delete(key).await
    }

    pub async fn get_or_fetch<T, F, Fut>(
        &self,
        key: &str,
        options: &CacheOptions,
        fetch_fn: F,
    ) -> std::result::Result<T, BffError>
    where
        T: Serialize + DeserializeOwned + Clone,
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = std::result::Result<T, BffError>>,
    {
        if let Ok(Some(cached)) = self.get::<T>(key).await {
            return Ok(cached);
        }

        let data = fetch_fn().await?;

        if let Err(e) = self.set(key, &data, options).await {
            console_log!("Cache set error: {:?}", e);
        }

        Ok(data)
    }
}

pub fn generate_cache_key(prefix: &str, parts: &[&str]) -> String {
    let mut key = prefix.to_string();
    for part in parts {
        key.push(':');
        key.push_str(part);
    }
    key.push_str(":v1");
    key
}

pub fn generate_search_cache_key(query: &str, filters: &[(&str, &str)]) -> String {
    use sha2::{Sha256, Digest};

    let mut hasher = Sha256::new();
    hasher.update(query);
    for (k, v) in filters {
        hasher.update(k.as_bytes());
        hasher.update(v.as_bytes());
    }
    let hash = hex::encode(hasher.finalize());
    format!("bff:search:{}:v1", &hash[..16])
}
