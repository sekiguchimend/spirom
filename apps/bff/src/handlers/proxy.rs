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

        // Forward Authorization header if present (with validation)
        if let Ok(Some(auth)) = req.headers().get("Authorization") {
            // ヘッダーインジェクション対策: 改行文字やCRLFを含むヘッダーを拒否
            if auth.contains('\r') || auth.contains('\n') || auth.contains('\0') {
                return Err(BffError::BadRequest("Invalid Authorization header".to_string()));
            }
            // Bearer形式の簡易検証
            if auth.starts_with("Bearer ") && auth.len() > 7 && auth.len() < 4096 {
                headers.set("Authorization", &auth).map_err(BffError::from)?;
            }
        }

        // Forward BFF proxy token for API authentication
        // Try multiple header name variations (case sensitivity)
        let bff_token = req.headers().get("x-bff-proxy-token")
            .or_else(|_| req.headers().get("X-Bff-Proxy-Token"))
            .or_else(|_| req.headers().get("X-BFF-Proxy-Token"))
            .ok()
            .flatten();

        if let Some(token) = bff_token {
            if !token.contains('\r') && !token.contains('\n') && !token.contains('\0') && token.len() < 256 {
                headers.set("X-BFF-Proxy-Token", &token).map_err(BffError::from)?;
                console_log!("[bff-proxy] Forwarding BFF token (len={})", token.len());
            }
        } else {
            console_log!("[bff-proxy] No BFF proxy token found in request headers");
        }

        // Forward session headers
        if let Ok(Some(session_id)) = req.headers().get("x-session-id") {
            if !session_id.contains('\r') && !session_id.contains('\n') && !session_id.contains('\0') && session_id.len() < 256 {
                headers.set("x-session-id", &session_id).map_err(BffError::from)?;
            }
        }
        if let Ok(Some(session_sig)) = req.headers().get("x-session-signature") {
            if !session_sig.contains('\r') && !session_sig.contains('\n') && !session_sig.contains('\0') && session_sig.len() < 256 {
                headers.set("x-session-signature", &session_sig).map_err(BffError::from)?;
            }
        }

        // Forward request ID for tracing
        if let Ok(Some(request_id)) = req.headers().get("x-request-id") {
            if !request_id.contains('\r') && !request_id.contains('\n') && !request_id.contains('\0') && request_id.len() < 128 {
                headers.set("x-request-id", &request_id).map_err(BffError::from)?;
            }
        }

        // Forward Content-Type for POST/PUT requests (with validation)
        if let Ok(Some(content_type)) = req.headers().get("Content-Type") {
            // ヘッダーインジェクション対策
            if content_type.contains('\r') || content_type.contains('\n') || content_type.contains('\0') {
                return Err(BffError::BadRequest("Invalid Content-Type header".to_string()));
            }
            // 許可されたContent-Typeのみ転送
            let allowed_types = ["application/json", "application/x-www-form-urlencoded", "multipart/form-data"];
            let is_allowed = allowed_types.iter().any(|t| content_type.starts_with(t));
            if is_allowed && content_type.len() < 256 {
                headers.set("Content-Type", &content_type).map_err(BffError::from)?;
            } else {
                headers.set("Content-Type", "application/json").map_err(BffError::from)?;
            }
        } else if method == Method::Post || method == Method::Put {
            headers.set("Content-Type", "application/json").map_err(BffError::from)?;
        }

        init.with_headers(headers);

        // Forward body for POST/PUT/PATCH requests
        // DoS対策: ボディサイズ制限（1MB）
        const MAX_BODY_SIZE: usize = 1024 * 1024;

        if method == Method::Post || method == Method::Put || method == Method::Patch {
            if let Ok(body) = req.text().await {
                // ボディサイズチェック
                if body.len() > MAX_BODY_SIZE {
                    return Err(BffError::BadRequest(format!(
                        "Request body too large: {} bytes (max: {} bytes)",
                        body.len(),
                        MAX_BODY_SIZE
                    )));
                }
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

        // 開発時は「どこに転送しているか」を必ず追えるようにヘッダを付与
        // （クライアント側で Network タブから確認できる）
        let env = std::env::var("ENVIRONMENT").unwrap_or_else(|_| "production".to_string());
        if env == "development" {
            let mut res = response;
            let headers = res.headers_mut();
            headers
                .set("x-bff-api-base-url", &self.api_base_url)
                .map_err(BffError::from)?;
            headers
                .set("x-bff-upstream-url", &url)
                .map_err(BffError::from)?;
            headers
                .set("x-bff-env", &env)
                .map_err(BffError::from)?;

            // 失敗時はBFF側ログにも残す（原因特定を確実にする）
            if res.status_code() >= 400 {
                console_log!(
                    "[bff-proxy] {} {} -> {} (status={})",
                    method.to_string(),
                    path,
                    url,
                    res.status_code()
                );
            }
            return Ok(res);
        }

        // Return the response as-is (preserve status code, headers, body)
        Ok(response)
    }
}
