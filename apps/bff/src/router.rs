use worker::*;
use crate::cache::CacheManager;
use crate::error::BffError;
use crate::handlers::{BffHandlers, SeoHandlers, ApiProxy, OrdersHandler, health_check, readiness_check};
use crate::middleware::{CorsMiddleware, RateLimiter, SecurityHeaders};
use crate::services::{ApiClient, SanityClient, DataAggregator};

pub async fn handle_request(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let url = req.url()?;
    let path = url.path();
    let method = req.method();

    let environment = env.var("ENVIRONMENT")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "production".to_string());

    // Bot/curl対策：Nextサーバーのみが付与できるプロキシトークン（本番では必須）
    let proxy_token_secret = env.secret("BFF_PROXY_TOKEN").ok().map(|s| s.to_string());

    let cors = if environment == "development" {
        CorsMiddleware::new().with_development()
    } else {
        CorsMiddleware::new()
    };

    if method == Method::Options {
        return cors.handle_preflight(&req);
    }

    let rate_limit_kv = env.kv("RATE_LIMIT")?;
    let rate_limiter = RateLimiter::new(rate_limit_kv.clone());

    // Rate limit のキーに使うIPは「信頼できる境界」からのみ取得する。
    // - 本番: Cloudflare が付与する `CF-Ray` がある場合のみ `CF-Connecting-IP` を信頼
    // - 開発: ローカル実行で `CF-Ray` が無いことがあるためフォールバックを許可
    fn sanitize_ip(s: String) -> String {
        s.chars()
            .filter(|c| c.is_ascii_hexdigit() || *c == '.' || *c == ':' )
            .collect::<String>()
    }

    let has_cf_ray = req.headers().get("CF-Ray")?.is_some();
    let client_ip = if has_cf_ray {
        req.headers()
            .get("CF-Connecting-IP")?
            .map(sanitize_ip)
            .unwrap_or_else(|| "unknown".to_string())
    } else if environment == "development" {
        // dev では X-Forwarded-For の先頭も許可（ローカルでの利便性のため）
        let xff = req.headers().get("X-Forwarded-For")?.unwrap_or_default();
        let first = xff.split(',').next().unwrap_or("unknown").trim().to_string();
        let candidate = if first.is_empty() {
            req.headers().get("CF-Connecting-IP")?.unwrap_or_else(|| "unknown".to_string())
        } else {
            first
        };
        sanitize_ip(candidate)
    } else {
        "unknown".to_string()
    };

    // 決済系はより厳格に（PaymentIntent無制限生成/ブルートフォース対策）
    if path.starts_with("/api/v1/payments/") || (path == "/api/v1/orders" && method == Method::Post) {
        // Next経由のみに制限（curl/Postman直叩き対策）
        if environment != "development" {
            let expected = match proxy_token_secret.clone() {
                Some(v) if !v.trim().is_empty() => v,
                _ => {
                    // 本番で未設定は危険なので fail-close
                    return Ok(BffError::InternalError("BFF_PROXY_TOKEN is not set".to_string()).to_response()?);
                }
            };

            let provided = req
                .headers()
                .get("X-BFF-Proxy-Token")?
                .or_else(|| req.headers().get("x-bff-proxy-token").ok().flatten())
                .unwrap_or_default();

            if provided != expected {
                return Ok(BffError::Unauthorized("Invalid proxy token".to_string()).to_response()?);
            }
        }

        let strict = RateLimiter::with_limits(rate_limit_kv.clone(), 60, 10);
        let strict_key = format!("{}:payments", client_ip);
        let strict_result = strict.check(&strict_key).await
            .map_err(|e| worker::Error::from(e.to_response().unwrap_err().to_string()))?;
        if !strict_result.allowed {
            let response = BffError::RateLimited.to_response()?;
            return strict.add_headers(response, &strict_result);
        }
    }

    let rate_result = rate_limiter.check(&client_ip).await
        .map_err(|e| worker::Error::from(e.to_response().unwrap_err().to_string()))?;

    if !rate_result.allowed {
        let response = BffError::RateLimited.to_response()?;
        return rate_limiter.add_headers(response, &rate_result);
    }

    let path_owned = path.to_string();
    let result = route_request(req, &path_owned, method, &env).await;

    let response = match result {
        Ok(response) => response,
        Err(e) => e.to_response()?,
    };

    let response = cors.apply_without_req(response, &environment)?;

    let response = if path_owned.starts_with("/bff/") || path_owned.starts_with("/api/") {
        SecurityHeaders::apply_api(response)?
    } else {
        SecurityHeaders::apply(response)?
    };

    rate_limiter.add_headers(response, &rate_result)
}

async fn route_request(
    req: Request,
    path: &str,
    method: Method,
    env: &Env,
) -> std::result::Result<Response, BffError> {
    // Health check endpoints (GET only)
    if method == Method::Get {
        match path {
            "/health" => return health_check(req, env.clone()).await.map_err(BffError::from),
            "/ready" => return readiness_check(req, env.clone()).await.map_err(BffError::from),
            _ => {}
        }
    }

    let api_base_url = env.var("API_BASE_URL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "http://localhost:8000".to_string());

    // API Proxy: Forward /api/v1/* requests to backend API
    // This must be checked before the GET-only check below
    if path.starts_with("/api/v1/") {
        let proxy = ApiProxy::new(api_base_url);
        return proxy.proxy(req, path).await;
    }

    // Below routes are GET only
    if method != Method::Get {
        return Err(BffError::BadRequest("Only GET method is allowed for this endpoint".to_string()));
    }

    let sanity_project_id = env.var("SANITY_PROJECT_ID")
        .map(|v| v.to_string())
        .unwrap_or_default();

    let sanity_dataset = env.var("SANITY_DATASET")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "production".to_string());

    let sanity_token = env.secret("SANITY_TOKEN")
        .map(|v| v.to_string())
        .ok();

    let site_url = env.var("SITE_URL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://spirom.com".to_string());

    let cache_kv = env.kv("CACHE").map_err(BffError::from)?;
    let cache = CacheManager::new(cache_kv);

    let api_client = ApiClient::new(api_base_url);
    let sanity_client = SanityClient::new(sanity_project_id.clone(), sanity_dataset.clone(), sanity_token.clone());

    if path.starts_with("/sitemap") || path == "/robots.txt" || path.starts_with("/.well-known/") {
        let seo_handlers = SeoHandlers::new(
            ApiClient::new(env.var("API_BASE_URL").map(|v| v.to_string()).unwrap_or_default()),
            SanityClient::new(sanity_project_id, sanity_dataset, sanity_token),
            cache,
            site_url,
        );

        return match path {
            "/sitemap.xml" => seo_handlers.sitemap_index().await,
            "/sitemap-pages.xml" => seo_handlers.sitemap_pages().await,
            "/sitemap-products.xml" => seo_handlers.sitemap_products().await,
            "/sitemap-categories.xml" => seo_handlers.sitemap_categories().await,
            "/sitemap-blog.xml" => seo_handlers.sitemap_blog().await,
            "/robots.txt" => seo_handlers.robots_txt().await,
            "/.well-known/security.txt" => seo_handlers.security_txt().await,
            _ => Err(BffError::NotFound("SEO resource not found".to_string())),
        };
    }

    if path.starts_with("/bff/v1/") {
        let aggregator = DataAggregator::new(api_client.clone(), sanity_client, site_url);
        let bff_handlers = BffHandlers::new(aggregator, cache);
        let orders_handler = OrdersHandler::new(api_client);

        let bff_path = &path[8..];

        return match bff_path {
            "home" => bff_handlers.home(req).await,
            "search" => bff_handlers.search(req).await,
            "blog" => bff_handlers.blog_list(req).await,
            "orders" => orders_handler.list(req).await,
            p if p.starts_with("products/") => {
                let slug = &p[9..];
                bff_handlers.product_detail(req, slug).await
            }
            p if p.starts_with("categories/") => {
                let slug = &p[11..];
                bff_handlers.category_page(req, slug).await
            }
            p if p.starts_with("blog/") => {
                let slug = &p[5..];
                bff_handlers.blog_detail(req, slug).await
            }
            p if p.starts_with("orders/") => {
                let order_id = &p[7..];
                orders_handler.detail(req, order_id).await
            }
            _ => Err(BffError::NotFound("BFF endpoint not found".to_string())),
        };
    }

    Err(BffError::NotFound("Resource not found".to_string()))
}
