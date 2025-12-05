use serde::de::DeserializeOwned;
use worker::*;
use crate::error::BffError;

pub struct ApiClient {
    base_url: String,
}

impl ApiClient {
    pub fn new(base_url: String) -> Self {
        Self { base_url }
    }

    pub async fn get<T: DeserializeOwned>(&self, path: &str) -> std::result::Result<T, BffError> {
        let url = format!("{}{}", self.base_url, path);

        let mut init = RequestInit::new();
        init.with_method(Method::Get);

        let mut headers = Headers::new();
        headers.set("Accept", "application/json").map_err(BffError::from)?;
        headers.set("User-Agent", "Spirom-BFF/1.0").map_err(BffError::from)?;
        init.with_headers(headers);

        let request = Request::new_with_init(&url, &init)
            .map_err(BffError::from)?;

        let mut response = Fetch::Request(request)
            .send()
            .await
            .map_err(|e| BffError::UpstreamError(e.to_string()))?;

        if !response.status_code() >= 200 && response.status_code() < 300 {
            let status = response.status_code();
            let body = response.text().await.unwrap_or_default();
            return Err(BffError::UpstreamError(
                format!("API returned {}: {}", status, body)
            ));
        }

        response
            .json::<T>()
            .await
            .map_err(|e| BffError::UpstreamError(e.to_string()))
    }

    pub async fn get_with_auth<T: DeserializeOwned>(
        &self,
        path: &str,
        token: &str,
    ) -> std::result::Result<T, BffError> {
        let url = format!("{}{}", self.base_url, path);

        let mut init = RequestInit::new();
        init.with_method(Method::Get);

        let mut headers = Headers::new();
        headers.set("Accept", "application/json").map_err(BffError::from)?;
        headers.set("Authorization", &format!("Bearer {}", token)).map_err(BffError::from)?;
        headers.set("User-Agent", "Spirom-BFF/1.0").map_err(BffError::from)?;
        init.with_headers(headers);

        let request = Request::new_with_init(&url, &init)
            .map_err(BffError::from)?;

        let mut response = Fetch::Request(request)
            .send()
            .await
            .map_err(|e| BffError::UpstreamError(e.to_string()))?;

        if response.status_code() == 401 {
            return Err(BffError::Unauthorized("Invalid or expired token".to_string()));
        }

        if !(response.status_code() >= 200 && response.status_code() < 300) {
            let status = response.status_code();
            let body = response.text().await.unwrap_or_default();
            return Err(BffError::UpstreamError(
                format!("API returned {}: {}", status, body)
            ));
        }

        response
            .json::<T>()
            .await
            .map_err(|e| BffError::UpstreamError(e.to_string()))
    }

    pub async fn post<T, R>(&self, path: &str, body: &T) -> std::result::Result<R, BffError>
    where
        T: serde::Serialize,
        R: DeserializeOwned,
    {
        let url = format!("{}{}", self.base_url, path);

        let mut init = RequestInit::new();
        init.with_method(Method::Post);

        let body_json = serde_json::to_string(body)
            .map_err(|e| BffError::InternalError(e.to_string()))?;
        init.with_body(Some(wasm_bindgen::JsValue::from_str(&body_json)));

        let mut headers = Headers::new();
        headers.set("Content-Type", "application/json").map_err(BffError::from)?;
        headers.set("Accept", "application/json").map_err(BffError::from)?;
        headers.set("User-Agent", "Spirom-BFF/1.0").map_err(BffError::from)?;
        init.with_headers(headers);

        let request = Request::new_with_init(&url, &init)
            .map_err(BffError::from)?;

        let mut response = Fetch::Request(request)
            .send()
            .await
            .map_err(|e| BffError::UpstreamError(e.to_string()))?;

        if !(response.status_code() >= 200 && response.status_code() < 300) {
            let status = response.status_code();
            let body = response.text().await.unwrap_or_default();
            return Err(BffError::UpstreamError(
                format!("API returned {}: {}", status, body)
            ));
        }

        response
            .json::<R>()
            .await
            .map_err(|e| BffError::UpstreamError(e.to_string()))
    }
}
