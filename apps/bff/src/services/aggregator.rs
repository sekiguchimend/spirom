use futures::future::join_all;
use crate::error::BffError;
use crate::models::*;
use crate::services::{ApiClient, SanityClient};

pub struct DataAggregator {
    api_client: ApiClient,
    sanity_client: SanityClient,
    site_url: String,
}

impl DataAggregator {
    pub fn new(api_client: ApiClient, sanity_client: SanityClient, site_url: String) -> Self {
        Self {
            api_client,
            sanity_client,
            site_url,
        }
    }

    pub async fn get_home_page_data(&self) -> Result<HomePageResponse, BffError> {
        let featured_future = self.api_client.get::<Vec<ProductListItem>>("/api/v1/products?featured=true&limit=8");
        let new_arrivals_future = self.api_client.get::<Vec<ProductListItem>>("/api/v1/products?sort=newest&limit=8");
        let categories_future = self.api_client.get::<Vec<Category>>("/api/v1/categories?limit=6");
        let posts_future = self.sanity_client.get_posts(3, 0);

        let (featured_result, new_arrivals_result, categories_result, posts_result) = futures::join!(
            featured_future,
            new_arrivals_future,
            categories_future,
            posts_future
        );

        let featured_products = featured_result.unwrap_or_default();
        let new_arrivals = new_arrivals_result.unwrap_or_default();
        let categories = categories_result.unwrap_or_default();
        let latest_posts = posts_result.unwrap_or_default();

        let hero = HeroSection {
            title: "Premium Quality Products".to_string(),
            subtitle: Some("Discover our curated collection".to_string()),
            image_url: format!("{}/images/hero.jpg", self.site_url),
            cta_text: "Shop Now".to_string(),
            cta_url: "/products".to_string(),
        };

        let json_ld = crate::seo::generate_website_json_ld(&self.site_url);

        let meta = MetaData {
            title: "Spirom - Premium Quality Products".to_string(),
            description: "Discover our curated collection of premium products.".to_string(),
            canonical: self.site_url.clone(),
            og_image: Some(format!("{}/images/og-home.jpg", self.site_url)),
            og_type: "website".to_string(),
        };

        Ok(HomePageResponse {
            hero,
            featured_products,
            new_arrivals,
            categories,
            latest_posts,
            json_ld,
            meta,
        })
    }

    pub async fn get_product_detail(&self, slug: &str) -> Result<ProductDetailResponse, BffError> {
        let product: Product = self.api_client
            .get(&format!("/api/v1/products/{}", slug))
            .await?;

        let related_url = format!("/api/v1/products?category={}&limit=4&exclude={}", product.category_id, product.id);
        let related_products = self.api_client.get::<Vec<ProductListItem>>(&related_url)
            .await
            .unwrap_or_default();

        let breadcrumbs = vec![
            Breadcrumb {
                name: "Home".to_string(),
                url: self.site_url.clone(),
            },
            Breadcrumb {
                name: product.category_name.clone(),
                url: format!("{}/categories/{}", self.site_url, product.category_id),
            },
            Breadcrumb {
                name: product.name.clone(),
                url: format!("{}/products/{}", self.site_url, product.slug),
            },
        ];

        let json_ld = crate::seo::generate_product_json_ld(&product, &self.site_url);

        let meta = MetaData {
            title: format!("{} | Spirom", product.name),
            description: product.description.chars().take(160).collect(),
            canonical: format!("{}/products/{}", self.site_url, product.slug),
            og_image: product.images.first().map(|i| i.url.clone()),
            og_type: "product".to_string(),
        };

        Ok(ProductDetailResponse {
            product,
            related_products,
            breadcrumbs,
            json_ld,
            meta,
        })
    }

    pub async fn get_category_page(
        &self,
        slug: &str,
        page: u32,
        per_page: u32,
    ) -> Result<CategoryPageResponse, BffError> {
        let category: Category = self.api_client
            .get(&format!("/api/v1/categories/{}", slug))
            .await?;

        let offset = (page - 1) * per_page;
        let products_url = format!(
            "/api/v1/products?category={}&limit={}&offset={}",
            category.id, per_page, offset
        );

        let subcategories_url = format!("/api/v1/categories?parent={}", category.id);
        let (products, subcategories) = futures::join!(
            self.api_client.get::<Vec<ProductListItem>>(&products_url),
            self.api_client.get::<Vec<Category>>(&subcategories_url)
        );

        let products = products.unwrap_or_default();
        let subcategories = subcategories.unwrap_or_default();

        let total: u64 = self.api_client
            .get(&format!("/api/v1/products/count?category={}", category.id))
            .await
            .unwrap_or(0);

        let total_pages = ((total as f64) / (per_page as f64)).ceil() as u32;

        let pagination = Pagination {
            page,
            per_page,
            total,
            total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
        };

        let breadcrumbs = vec![
            Breadcrumb {
                name: "Home".to_string(),
                url: self.site_url.clone(),
            },
            Breadcrumb {
                name: category.name.clone(),
                url: format!("{}/categories/{}", self.site_url, category.slug),
            },
        ];

        let json_ld = crate::seo::generate_breadcrumb_json_ld(&breadcrumbs);

        let meta = MetaData {
            title: format!("{} | Spirom", category.name),
            description: category.description.clone().unwrap_or_else(|| {
                format!("Browse {} products at Spirom", category.name)
            }),
            canonical: format!("{}/categories/{}", self.site_url, category.slug),
            og_image: category.image_url.clone(),
            og_type: "website".to_string(),
        };

        Ok(CategoryPageResponse {
            category,
            products,
            pagination,
            breadcrumbs,
            subcategories,
            json_ld,
            meta,
        })
    }

    pub async fn get_blog_detail(&self, slug: &str) -> Result<BlogDetailResponse, BffError> {
        let post = self.sanity_client
            .get_post_by_slug(slug)
            .await?
            .ok_or_else(|| BffError::NotFound(format!("Blog post not found: {}", slug)))?;

        let related_posts = self.sanity_client
            .get_related_posts(&post.id, 3)
            .await
            .unwrap_or_default();

        let breadcrumbs = vec![
            Breadcrumb {
                name: "Home".to_string(),
                url: self.site_url.clone(),
            },
            Breadcrumb {
                name: "Blog".to_string(),
                url: format!("{}/blog", self.site_url),
            },
            Breadcrumb {
                name: post.title.clone(),
                url: format!("{}/blog/{}", self.site_url, post.slug),
            },
        ];

        let json_ld = crate::seo::generate_article_json_ld(&post, &self.site_url);

        let meta = MetaData {
            title: format!("{} | Spirom Blog", post.title),
            description: post.excerpt.clone().unwrap_or_else(|| {
                post.content.chars().take(160).collect()
            }),
            canonical: format!("{}/blog/{}", self.site_url, post.slug),
            og_image: post.featured_image.as_ref().map(|i| i.url.clone()),
            og_type: "article".to_string(),
        };

        Ok(BlogDetailResponse {
            post,
            related_posts,
            breadcrumbs,
            json_ld,
            meta,
        })
    }

    pub async fn get_blog_list(&self, page: u32, per_page: u32) -> Result<BlogListResponse, BffError> {
        let offset = (page - 1) * per_page;
        
        let (posts, total) = futures::join!(
            self.sanity_client.get_posts(per_page as usize, offset as usize),
            self.sanity_client.get_posts_count()
        );

        let posts = posts.unwrap_or_default();
        let total = total.unwrap_or(0);

        let total_pages = ((total as f64) / (per_page as f64)).ceil() as u32;

        let pagination = Pagination {
            page,
            per_page,
            total,
            total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
        };

        let meta = MetaData {
            title: "ブログ | Spirom".to_string(),
            description: "暮らしのヒントや商品の使い方、スタッフおすすめの情報をお届けするSpiromのブログです。".to_string(),
            canonical: format!("{}/blog", self.site_url),
            og_image: Some(format!("{}/images/og-blog.jpg", self.site_url)),
            og_type: "website".to_string(),
        };

        Ok(BlogListResponse {
            posts,
            pagination,
            meta,
        })
    }

    pub async fn search_products(&self, request: &SearchRequest) -> Result<SearchResponse, BffError> {
        let page = request.page.unwrap_or(1);
        let per_page = request.per_page.unwrap_or(20);
        let offset = (page - 1) * per_page;

        let encoded_query: String = url::form_urlencoded::byte_serialize(request.query.as_bytes()).collect();
        let mut query_params = vec![
            format!("q={}", encoded_query),
            format!("limit={}", per_page),
            format!("offset={}", offset),
        ];

        if let Some(ref cat) = request.category {
            query_params.push(format!("category={}", cat));
        }
        if let Some(min) = request.min_price {
            query_params.push(format!("min_price={}", min));
        }
        if let Some(max) = request.max_price {
            query_params.push(format!("max_price={}", max));
        }
        if let Some(ref sort) = request.sort {
            let sort_str = match sort {
                SearchSort::Relevance => "relevance",
                SearchSort::PriceAsc => "price_asc",
                SearchSort::PriceDesc => "price_desc",
                SearchSort::Newest => "newest",
                SearchSort::Popular => "popular",
            };
            query_params.push(format!("sort={}", sort_str));
        }

        let url = format!("/api/v1/search?{}", query_params.join("&"));

        #[derive(serde::Deserialize)]
        struct SearchApiResponse {
            products: Vec<ProductListItem>,
            total: u64,
            facets: SearchFacets,
        }

        let api_response: SearchApiResponse = self.api_client.get(&url).await?;

        let total_pages = ((api_response.total as f64) / (per_page as f64)).ceil() as u32;

        let pagination = Pagination {
            page,
            per_page,
            total: api_response.total,
            total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
        };

        let meta = MetaData {
            title: format!("Search: {} | Spirom", request.query),
            description: format!("Search results for '{}' - {} products found", request.query, api_response.total),
            canonical: format!("{}/search?q={}", self.site_url, encoded_query),
            og_image: None,
            og_type: "website".to_string(),
        };

        Ok(SearchResponse {
            products: api_response.products,
            pagination,
            facets: api_response.facets,
            meta,
        })
    }
}
