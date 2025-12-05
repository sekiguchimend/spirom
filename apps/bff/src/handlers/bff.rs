use worker::*;
use crate::cache::{CacheManager, CacheOptions, generate_cache_key, generate_search_cache_key};
use crate::error::BffError;
use crate::models::*;
use crate::services::DataAggregator;

pub struct BffHandlers {
    aggregator: DataAggregator,
    cache: CacheManager,
}

impl BffHandlers {
    pub fn new(aggregator: DataAggregator, cache: CacheManager) -> Self {
        Self { aggregator, cache }
    }

    pub async fn home(&self, _req: Request) -> std::result::Result<Response, BffError> {
        let cache_key = generate_cache_key("bff", &["home"]);

        let data = self.cache.get_or_fetch(
            &cache_key,
            &CacheOptions::medium(),
            || self.aggregator.get_home_page_data(),
        ).await?;

        let response = Response::from_json(&data)
            .map_err(BffError::from)?;

        add_cache_headers(response, 300, 600)
    }

    pub async fn product_detail(&self, _req: Request, slug: &str) -> std::result::Result<Response, BffError> {
        if slug.is_empty() || slug.len() > 200 {
            return Err(BffError::BadRequest("Invalid slug".to_string()));
        }

        let cache_key = generate_cache_key("bff", &["product", slug]);

        let data = self.cache.get_or_fetch(
            &cache_key,
            &CacheOptions::short(),
            || self.aggregator.get_product_detail(slug),
        ).await?;

        let response = Response::from_json(&data)
            .map_err(BffError::from)?;

        add_cache_headers(response, 60, 120)
    }

    pub async fn category_page(&self, req: Request, slug: &str) -> std::result::Result<Response, BffError> {
        if slug.is_empty() || slug.len() > 200 {
            return Err(BffError::BadRequest("Invalid slug".to_string()));
        }

        let url = req.url().map_err(BffError::from)?;
        let params: std::collections::HashMap<String, String> = url
            .query_pairs()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();

        let page: u32 = params.get("page").and_then(|p| p.parse().ok()).unwrap_or(1);
        let per_page: u32 = params.get("per_page").and_then(|p| p.parse().ok()).unwrap_or(20);

        let per_page = per_page.min(100);

        let cache_key = generate_cache_key("bff", &["category", slug, &page.to_string()]);

        let data = self.cache.get_or_fetch(
            &cache_key,
            &CacheOptions::medium(),
            || self.aggregator.get_category_page(slug, page, per_page),
        ).await?;

        let response = Response::from_json(&data)
            .map_err(BffError::from)?;

        add_cache_headers(response, 300, 600)
    }

    pub async fn blog_detail(&self, _req: Request, slug: &str) -> std::result::Result<Response, BffError> {
        if slug.is_empty() || slug.len() > 200 {
            return Err(BffError::BadRequest("Invalid slug".to_string()));
        }

        let cache_key = generate_cache_key("bff", &["blog", slug]);

        let data = self.cache.get_or_fetch(
            &cache_key,
            &CacheOptions::short(),
            || self.aggregator.get_blog_detail(slug),
        ).await?;

        let response = Response::from_json(&data)
            .map_err(BffError::from)?;

        add_cache_headers(response, 60, 120)
    }

    pub async fn search(&self, req: Request) -> std::result::Result<Response, BffError> {
        let url = req.url().map_err(BffError::from)?;
        let params: std::collections::HashMap<String, String> = url
            .query_pairs()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();

        let query = params.get("q").cloned().unwrap_or_default();

        if query.is_empty() {
            return Err(BffError::BadRequest("Search query is required".to_string()));
        }

        if query.len() > 500 {
            return Err(BffError::BadRequest("Search query too long".to_string()));
        }

        let search_request = SearchRequest {
            query: query.clone(),
            category: params.get("category").cloned(),
            min_price: params.get("min_price").and_then(|p| p.parse().ok()),
            max_price: params.get("max_price").and_then(|p| p.parse().ok()),
            sort: params.get("sort").and_then(|s| match s.as_str() {
                "relevance" => Some(SearchSort::Relevance),
                "price_asc" => Some(SearchSort::PriceAsc),
                "price_desc" => Some(SearchSort::PriceDesc),
                "newest" => Some(SearchSort::Newest),
                "popular" => Some(SearchSort::Popular),
                _ => None,
            }),
            page: params.get("page").and_then(|p| p.parse().ok()),
            per_page: params.get("per_page").and_then(|p| p.parse().ok()),
        };

        let mut filters: Vec<(&str, &str)> = vec![];
        if let Some(ref cat) = search_request.category {
            filters.push(("category", cat));
        }

        let cache_key = generate_search_cache_key(&query, &filters);

        let data = self.cache.get_or_fetch(
            &cache_key,
            &CacheOptions::short(),
            || self.aggregator.search_products(&search_request),
        ).await?;

        let response = Response::from_json(&data)
            .map_err(BffError::from)?;

        add_cache_headers(response, 30, 60)
    }
}

fn add_cache_headers(response: Response, max_age: u32, stale_while_revalidate: u32) -> std::result::Result<Response, BffError> {
    let mut headers = response.headers().clone();

    headers.set(
        "Cache-Control",
        &format!(
            "public, max-age={}, s-maxage={}, stale-while-revalidate={}",
            max_age,
            max_age,
            stale_while_revalidate
        )
    ).map_err(BffError::from)?;

    headers.set("Vary", "Accept-Encoding, Accept").map_err(BffError::from)?;

    Ok(response.with_headers(headers))
}
