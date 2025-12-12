use worker::*;

pub struct CorsMiddleware {
    allowed_origins: Vec<String>,
    allowed_methods: Vec<String>,
    allowed_headers: Vec<String>,
    max_age: u32,
}

impl CorsMiddleware {
    pub fn new() -> Self {
        Self {
            allowed_origins: vec![
                "https://spirom.com".to_string(),
                "https://www.spirom.com".to_string(),
            ],
            allowed_methods: vec![
                "GET".to_string(),
                "POST".to_string(),
                "PUT".to_string(),
                "DELETE".to_string(),
                "OPTIONS".to_string(),
            ],
            allowed_headers: vec![
                "Content-Type".to_string(),
                "Authorization".to_string(),
                "X-Requested-With".to_string(),
            ],
            max_age: 86400,
        }
    }

    pub fn with_development(mut self) -> Self {
        self.allowed_origins.push("http://localhost:3000".to_string());
        self.allowed_origins.push("http://127.0.0.1:3000".to_string());
        self.allowed_origins.push("http://localhost:8787".to_string());
        self.allowed_origins.push("http://127.0.0.1:8787".to_string());
        self
    }

    pub fn handle_preflight(&self, req: &Request) -> Result<Response> {
        let origin = req.headers().get("Origin")?.unwrap_or_default();

        let mut headers = Headers::new();

        if self.is_origin_allowed(&origin) {
            headers.set("Access-Control-Allow-Origin", &origin)?;
            headers.set("Access-Control-Allow-Credentials", "true")?;
        }

        headers.set(
            "Access-Control-Allow-Methods",
            &self.allowed_methods.join(", ")
        )?;

        headers.set(
            "Access-Control-Allow-Headers",
            &self.allowed_headers.join(", ")
        )?;

        headers.set("Access-Control-Max-Age", &self.max_age.to_string())?;

        headers.set("Content-Length", "0")?;

        Ok(Response::empty()?.with_status(204).with_headers(headers))
    }

    pub fn apply(&self, req: &Request, mut response: Response) -> Result<Response> {
        let origin = req.headers().get("Origin")?.unwrap_or_default();

        if !origin.is_empty() && self.is_origin_allowed(&origin) {
            let mut headers = response.headers().clone();
            headers.set("Access-Control-Allow-Origin", &origin)?;
            headers.set("Access-Control-Allow-Credentials", "true")?;
            headers.set("Vary", "Origin")?;
            response = response.with_headers(headers);
        }

        Ok(response)
    }

    pub fn apply_without_req(&self, mut response: Response, environment: &str) -> Result<Response> {
        // In development, allow localhost origins (both localhost and 127.0.0.1)
        let allowed_origin = if environment == "development" {
            "http://localhost:3000"
        } else {
            "https://spirom.com"
        };

        let mut headers = response.headers().clone();
        headers.set("Access-Control-Allow-Origin", allowed_origin)?;
        headers.set("Access-Control-Allow-Credentials", "true")?;
        headers.set("Vary", "Origin")?;
        response = response.with_headers(headers);

        Ok(response)
    }

    fn is_origin_allowed(&self, origin: &str) -> bool {
        self.allowed_origins.iter().any(|allowed| {
            allowed == "*" || allowed == origin
        })
    }
}

impl Default for CorsMiddleware {
    fn default() -> Self {
        Self::new()
    }
}
