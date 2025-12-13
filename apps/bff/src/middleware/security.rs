use worker::*;

pub struct SecurityHeaders;

impl SecurityHeaders {
    pub fn apply(response: Response) -> Result<Response> {
        let mut headers = response.headers().clone();

        headers.set(
            "Content-Security-Policy",
            "default-src 'self'; \
             script-src 'self' https://cdn.sanity.io; \
             style-src 'self' https://fonts.googleapis.com; \
             font-src 'self' https://fonts.gstatic.com; \
             img-src 'self' data: https: blob:; \
             connect-src 'self' https://api.spirom.com https://*.sanity.io; \
             frame-ancestors 'none'; \
             base-uri 'self'; \
             form-action 'self';"
        )?;

        headers.set(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload"
        )?;

        headers.set("X-Content-Type-Options", "nosniff")?;

        headers.set("X-Frame-Options", "DENY")?;

        headers.set("X-XSS-Protection", "1; mode=block")?;

        headers.set("Referrer-Policy", "strict-origin-when-cross-origin")?;

        headers.set(
            "Permissions-Policy",
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), \
             magnetometer=(), microphone=(), payment=(), usb=()"
        )?;

        headers.set("X-DNS-Prefetch-Control", "on")?;

        Ok(response.with_headers(headers))
    }

    pub fn apply_api(response: Response) -> Result<Response> {
        let mut headers = response.headers().clone();

        headers.set(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains"
        )?;

        headers.set("X-Content-Type-Options", "nosniff")?;

        headers.set("Cache-Control", "no-store, no-cache, must-revalidate")?;

        headers.set("Pragma", "no-cache")?;

        Ok(response.with_headers(headers))
    }

    pub fn apply_static(response: Response, max_age: u32) -> Result<Response> {
        let mut headers = response.headers().clone();

        headers.set(
            "Cache-Control",
            &format!("public, max-age={}, immutable", max_age)
        )?;

        headers.set("X-Content-Type-Options", "nosniff")?;

        Ok(response.with_headers(headers))
    }
}

pub fn validate_origin(origin: &str, allowed_origins: &[&str]) -> bool {
    allowed_origins.iter().any(|allowed| {
        if *allowed == "*" {
            return true;
        }
        origin == *allowed
    })
}

pub fn sanitize_path(path: &str) -> String {
    let mut sanitized = String::new();
    let mut prev_slash = false;

    for c in path.chars() {
        match c {
            '/' if prev_slash => continue,
            '/' => {
                sanitized.push(c);
                prev_slash = true;
            }
            '.' if sanitized.ends_with("/..") || sanitized.ends_with("/.") => {
                continue;
            }
            c if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' || c == '/' => {
                sanitized.push(c);
                prev_slash = false;
            }
            _ => continue,
        }
    }

    if sanitized.contains("..") {
        return "/".to_string();
    }

    sanitized
}
