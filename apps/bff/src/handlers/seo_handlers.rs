use worker::*;
use crate::cache::{CacheManager, CacheOptions, generate_cache_key};
use crate::error::BffError;
use crate::models::seo::{SitemapUrl, ChangeFreq};
use crate::services::{ApiClient, SanityClient};
use crate::seo::{generate_sitemap_xml, generate_sitemap_index, generate_robots_txt};

pub struct SeoHandlers {
    api_client: ApiClient,
    sanity_client: SanityClient,
    cache: CacheManager,
    site_url: String,
}

impl SeoHandlers {
    pub fn new(
        api_client: ApiClient,
        sanity_client: SanityClient,
        cache: CacheManager,
        site_url: String,
    ) -> Self {
        Self {
            api_client,
            sanity_client,
            cache,
            site_url,
        }
    }

    pub async fn sitemap_index(&self) -> std::result::Result<Response, BffError> {
        let cache_key = generate_cache_key("seo", &["sitemap-index"]);

        let xml = self.cache.get_or_fetch(
            &cache_key,
            &CacheOptions::long(),
            || async {
                let now = chrono::Utc::now().format("%Y-%m-%d").to_string();
                let sitemaps = vec![
                    ("/sitemap-pages.xml", now.as_str()),
                    ("/sitemap-products.xml", now.as_str()),
                    ("/sitemap-categories.xml", now.as_str()),
                    ("/sitemap-blog.xml", now.as_str()),
                ];

                Ok(generate_sitemap_index(&sitemaps, &self.site_url))
            },
        ).await?;

        xml_response(&xml)
    }

    pub async fn sitemap_pages(&self) -> std::result::Result<Response, BffError> {
        let cache_key = generate_cache_key("seo", &["sitemap-pages"]);

        let xml = self.cache.get_or_fetch(
            &cache_key,
            &CacheOptions::long(),
            || async {
                let urls = vec![
                    SitemapUrl {
                        loc: self.site_url.clone(),
                        lastmod: None,
                        changefreq: Some(ChangeFreq::Daily),
                        priority: Some(1.0),
                    },
                    SitemapUrl {
                        loc: format!("{}/products", self.site_url),
                        lastmod: None,
                        changefreq: Some(ChangeFreq::Daily),
                        priority: Some(0.9),
                    },
                    SitemapUrl {
                        loc: format!("{}/categories", self.site_url),
                        lastmod: None,
                        changefreq: Some(ChangeFreq::Weekly),
                        priority: Some(0.8),
                    },
                    SitemapUrl {
                        loc: format!("{}/blog", self.site_url),
                        lastmod: None,
                        changefreq: Some(ChangeFreq::Daily),
                        priority: Some(0.8),
                    },
                    SitemapUrl {
                        loc: format!("{}/about", self.site_url),
                        lastmod: None,
                        changefreq: Some(ChangeFreq::Monthly),
                        priority: Some(0.5),
                    },
                    SitemapUrl {
                        loc: format!("{}/contact", self.site_url),
                        lastmod: None,
                        changefreq: Some(ChangeFreq::Monthly),
                        priority: Some(0.5),
                    },
                ];

                Ok(generate_sitemap_xml(&urls))
            },
        ).await?;

        xml_response(&xml)
    }

    pub async fn sitemap_products(&self) -> std::result::Result<Response, BffError> {
        let cache_key = generate_cache_key("seo", &["sitemap-products"]);

        let xml = self.cache.get_or_fetch(
            &cache_key,
            &CacheOptions::long(),
            || async {
                #[derive(serde::Deserialize)]
                struct ProductSlug {
                    slug: String,
                    updated_at: Option<String>,
                }

                let products: Vec<ProductSlug> = self.api_client
                    .get("/api/v1/products/slugs")
                    .await
                    .unwrap_or_default();

                let urls: Vec<SitemapUrl> = products
                    .into_iter()
                    .map(|p| SitemapUrl {
                        loc: format!("{}/products/{}", self.site_url, p.slug),
                        lastmod: p.updated_at,
                        changefreq: Some(ChangeFreq::Daily),
                        priority: Some(0.8),
                    })
                    .collect();

                Ok(generate_sitemap_xml(&urls))
            },
        ).await?;

        xml_response(&xml)
    }

    pub async fn sitemap_categories(&self) -> std::result::Result<Response, BffError> {
        let cache_key = generate_cache_key("seo", &["sitemap-categories"]);

        let xml = self.cache.get_or_fetch(
            &cache_key,
            &CacheOptions::long(),
            || async {
                #[derive(serde::Deserialize)]
                struct CategorySlug {
                    slug: String,
                }

                let categories: Vec<CategorySlug> = self.api_client
                    .get("/api/v1/categories/slugs")
                    .await
                    .unwrap_or_default();

                let urls: Vec<SitemapUrl> = categories
                    .into_iter()
                    .map(|c| SitemapUrl {
                        loc: format!("{}/categories/{}", self.site_url, c.slug),
                        lastmod: None,
                        changefreq: Some(ChangeFreq::Weekly),
                        priority: Some(0.7),
                    })
                    .collect();

                Ok(generate_sitemap_xml(&urls))
            },
        ).await?;

        xml_response(&xml)
    }

    pub async fn sitemap_blog(&self) -> std::result::Result<Response, BffError> {
        let cache_key = generate_cache_key("seo", &["sitemap-blog"]);

        let xml = self.cache.get_or_fetch(
            &cache_key,
            &CacheOptions::long(),
            || async {
                let slugs = self.sanity_client
                    .get_all_post_slugs()
                    .await
                    .unwrap_or_default();

                let urls: Vec<SitemapUrl> = slugs
                    .into_iter()
                    .map(|slug| SitemapUrl {
                        loc: format!("{}/blog/{}", self.site_url, slug),
                        lastmod: None,
                        changefreq: Some(ChangeFreq::Weekly),
                        priority: Some(0.7),
                    })
                    .collect();

                Ok(generate_sitemap_xml(&urls))
            },
        ).await?;

        xml_response(&xml)
    }

    pub async fn robots_txt(&self) -> std::result::Result<Response, BffError> {
        let txt = generate_robots_txt(&self.site_url);

        let mut headers = Headers::new();
        headers.set("Content-Type", "text/plain; charset=utf-8")
            .map_err(BffError::from)?;
        headers.set("Cache-Control", "public, max-age=86400")
            .map_err(BffError::from)?;

        Response::ok(txt)
            .map(|r| r.with_headers(headers))
            .map_err(BffError::from)
    }

    pub async fn security_txt(&self) -> std::result::Result<Response, BffError> {
        let content = format!(
            r#"Contact: mailto:info@spirom.shop
Expires: {}
Preferred-Languages: ja, en
Canonical: {}/.well-known/security.txt
"#,
            chrono::Utc::now()
                .checked_add_signed(chrono::Duration::days(365))
                .unwrap()
                .format("%Y-%m-%dT%H:%M:%S.000Z"),
            self.site_url
        );

        let mut headers = Headers::new();
        headers.set("Content-Type", "text/plain; charset=utf-8")
            .map_err(BffError::from)?;
        headers.set("Cache-Control", "public, max-age=86400")
            .map_err(BffError::from)?;

        Response::ok(content)
            .map(|r| r.with_headers(headers))
            .map_err(BffError::from)
    }
}

fn xml_response(xml: &str) -> std::result::Result<Response, BffError> {
    let mut headers = Headers::new();
    headers.set("Content-Type", "application/xml; charset=utf-8")
        .map_err(BffError::from)?;
    headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600")
        .map_err(BffError::from)?;

    Response::ok(xml.to_string())
        .map(|r| r.with_headers(headers))
        .map_err(BffError::from)
}
