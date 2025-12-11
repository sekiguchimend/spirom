use worker::*;
use crate::error::BffError;

pub struct ApiProxy {
    api_base_url: String,
}

impl ApiProxy {
    pub fn new(api_base_url: String) -> Self {
        Self { api_base_url }
    }

    /// Proxy a request to the backend API
    pub async fn proxy(&self, mut req: Request, path: &str) -> std::result::Result<Response, BffError> {
        let url = format!("{}{}", self.api_base_url, path);
        let method = req.method();

        let mut init = RequestInit::new();
        init.with_method(method.clone());

        // Copy headers from original request
        let mut headers = Headers::new();
        headers.set("Accept", "application/json").map_err(BffError::from)?;
        headers.set("User-Agent", "Spirom-BFF/1.0").map_err(BffError::from)?;

        // Forward Authorization header if present
        if let Ok(Some(auth)) = req.headers().get("Authorization") {
            headers.set("Authorization", &auth).map_err(BffError::from)?;
        }

        // Forward Content-Type for POST/PUT requests
        if let Ok(Some(content_type)) = req.headers().get("Content-Type") {
            headers.set("Content-Type", &content_type).map_err(BffError::from)?;
        } else if method == Method::Post || method == Method::Put {
            headers.set("Content-Type", "application/json").map_err(BffError::from)?;
        }

        init.with_headers(headers);

        // Forward body for POST/PUT/PATCH requests
        if method == Method::Post || method == Method::Put || method == Method::Patch {
            if let Ok(body) = req.text().await {
                if !body.is_empty() {
                    init.with_body(Some(wasm_bindgen::JsValue::from_str(&body)));
                }
            }
        }

        let proxy_request = Request::new_with_init(&url, &init)
            .map_err(BffError::from)?;

        let response = Fetch::Request(proxy_request)
            .send()
            .await
            .map_err(|e| BffError::UpstreamError(e.to_string()))?;

        // Return the response as-is (preserve status code, headers, body)
        Ok(response)
    }
}
