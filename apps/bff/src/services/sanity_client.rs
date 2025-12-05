use serde::de::DeserializeOwned;
use worker::*;
use crate::error::BffError;
use crate::models::blog::{BlogPost, BlogListItem};

pub struct SanityClient {
    project_id: String,
    dataset: String,
    token: Option<String>,
    api_version: String,
}

impl SanityClient {
    pub fn new(project_id: String, dataset: String, token: Option<String>) -> Self {
        Self {
            project_id,
            dataset,
            token,
            api_version: "2024-01-01".to_string(),
        }
    }

    pub async fn query<T: DeserializeOwned>(&self, query: &str) -> std::result::Result<T, BffError> {
        let encoded_query = url::form_urlencoded::Serializer::new(String::new())
            .append_pair("query", query)
            .finish();

        let url = format!(
            "https://{}.api.sanity.io/v{}/data/query/{}?{}",
            self.project_id,
            self.api_version,
            self.dataset,
            encoded_query
        );

        let mut init = RequestInit::new();
        init.with_method(Method::Get);

        let mut headers = Headers::new();
        headers.set("Accept", "application/json").map_err(BffError::from)?;

        if let Some(ref token) = self.token {
            headers.set("Authorization", &format!("Bearer {}", token)).map_err(BffError::from)?;
        }

        init.with_headers(headers);

        let request = Request::new_with_init(&url, &init)
            .map_err(BffError::from)?;

        let mut response = Fetch::Request(request)
            .send()
            .await
            .map_err(|e| BffError::UpstreamError(format!("Sanity API error: {}", e)))?;

        if !(response.status_code() >= 200 && response.status_code() < 300) {
            let status = response.status_code();
            let body = response.text().await.unwrap_or_default();
            return Err(BffError::UpstreamError(
                format!("Sanity API returned {}: {}", status, body)
            ));
        }

        #[derive(serde::Deserialize)]
        struct SanityResponse<T> {
            result: T,
        }

        let sanity_response: SanityResponse<T> = response
            .json()
            .await
            .map_err(|e| BffError::UpstreamError(e.to_string()))?;

        Ok(sanity_response.result)
    }

    pub async fn get_posts(&self, limit: usize, offset: usize) -> std::result::Result<Vec<BlogListItem>, BffError> {
        let query = format!(
            r#"*[_type == "post" && defined(slug.current)] | order(publishedAt desc) [{}..({}+{})] {{
                "id": _id,
                "slug": slug.current,
                title,
                excerpt,
                "featured_image": mainImage{{
                    "url": asset->url,
                    "alt": alt
                }},
                "author": author->{{
                    "id": _id,
                    name,
                    "slug": slug.current,
                    "image": image.asset->url
                }},
                "published_at": publishedAt,
                "reading_time": round(length(pt::text(body)) / 5 / 200)
            }}"#,
            offset,
            offset,
            limit
        );

        self.query(&query).await
    }

    pub async fn get_post_by_slug(&self, slug: &str) -> std::result::Result<Option<BlogPost>, BffError> {
        let query = format!(
            r#"*[_type == "post" && slug.current == "{}"][0] {{
                "id": _id,
                "slug": slug.current,
                title,
                excerpt,
                "content": pt::text(body),
                "featured_image": mainImage{{
                    "url": asset->url,
                    "alt": alt
                }},
                "author": author->{{
                    "id": _id,
                    name,
                    "slug": slug.current,
                    "image": image.asset->url,
                    bio
                }},
                "category": categories[0]->{{
                    "id": _id,
                    "name": title,
                    "slug": slug.current
                }},
                "tags": categories[]->slug.current,
                "published_at": publishedAt,
                "updated_at": _updatedAt,
                "reading_time": round(length(pt::text(body)) / 5 / 200)
            }}"#,
            slug
        );

        self.query(&query).await
    }

    pub async fn get_related_posts(&self, post_id: &str, limit: usize) -> std::result::Result<Vec<BlogListItem>, BffError> {
        let query = format!(
            r#"*[_type == "post" && _id != "{}" && defined(slug.current)] | order(publishedAt desc) [0...{}] {{
                "id": _id,
                "slug": slug.current,
                title,
                excerpt,
                "featured_image": mainImage{{
                    "url": asset->url,
                    "alt": alt
                }},
                "author": author->{{
                    "id": _id,
                    name,
                    "slug": slug.current,
                    "image": image.asset->url
                }},
                "published_at": publishedAt,
                "reading_time": round(length(pt::text(body)) / 5 / 200)
            }}"#,
            post_id,
            limit
        );

        self.query(&query).await
    }

    pub async fn get_posts_count(&self) -> std::result::Result<u64, BffError> {
        let query = r#"count(*[_type == "post" && defined(slug.current)])"#;
        self.query(query).await
    }

    pub async fn get_all_post_slugs(&self) -> std::result::Result<Vec<String>, BffError> {
        let query = r#"*[_type == "post" && defined(slug.current)].slug.current"#;
        self.query(query).await
    }
}
