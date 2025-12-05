use crate::models::*;
use crate::models::seo::*;

pub fn generate_product_json_ld(product: &Product, site_url: &str) -> String {
    let availability = if product.is_available && product.stock_quantity > 0 {
        "https://schema.org/InStock"
    } else {
        "https://schema.org/OutOfStock"
    };

    let json_ld = JsonLdProduct {
        context: "https://schema.org".to_string(),
        type_: "Product".to_string(),
        name: product.name.clone(),
        description: product.description.clone(),
        image: product.images.iter().map(|i| i.url.clone()).collect(),
        sku: product.id.clone(),
        brand: JsonLdBrand {
            type_: "Brand".to_string(),
            name: "Spirom".to_string(),
        },
        offers: JsonLdOffer {
            type_: "Offer".to_string(),
            url: format!("{}/products/{}", site_url, product.slug),
            price_currency: product.currency.clone(),
            price: format!("{:.2}", product.price as f64 / 100.0),
            availability: availability.to_string(),
            item_condition: "https://schema.org/NewCondition".to_string(),
        },
        aggregate_rating: None,
    };

    serde_json::to_string(&json_ld).unwrap_or_default()
}

pub fn generate_breadcrumb_json_ld(breadcrumbs: &[Breadcrumb]) -> String {
    let items: Vec<JsonLdListItem> = breadcrumbs
        .iter()
        .enumerate()
        .map(|(i, bc)| JsonLdListItem {
            type_: "ListItem".to_string(),
            position: (i + 1) as u32,
            name: bc.name.clone(),
            item: bc.url.clone(),
        })
        .collect();

    let json_ld = JsonLdBreadcrumbList {
        context: "https://schema.org".to_string(),
        type_: "BreadcrumbList".to_string(),
        item_list_element: items,
    };

    serde_json::to_string(&json_ld).unwrap_or_default()
}

pub fn generate_organization_json_ld(site_url: &str) -> String {
    let json_ld = JsonLdOrganization {
        context: "https://schema.org".to_string(),
        type_: "Organization".to_string(),
        name: "Spirom".to_string(),
        url: site_url.to_string(),
        logo: format!("{}/images/logo.png", site_url),
        same_as: Some(vec![
            "https://twitter.com/spirom".to_string(),
            "https://www.instagram.com/spirom".to_string(),
        ]),
        contact_point: Some(JsonLdContactPoint {
            type_: "ContactPoint".to_string(),
            telephone: "+81-XXX-XXXX-XXXX".to_string(),
            contact_type: "customer service".to_string(),
            area_served: "JP".to_string(),
            available_language: vec!["Japanese".to_string(), "English".to_string()],
        }),
    };

    serde_json::to_string(&json_ld).unwrap_or_default()
}

pub fn generate_website_json_ld(site_url: &str) -> String {
    let json_ld = JsonLdWebSite {
        context: "https://schema.org".to_string(),
        type_: "WebSite".to_string(),
        name: "Spirom".to_string(),
        url: site_url.to_string(),
        potential_action: JsonLdSearchAction {
            type_: "SearchAction".to_string(),
            target: JsonLdEntryPoint {
                type_: "EntryPoint".to_string(),
                url_template: format!("{}/search?q={{search_term_string}}", site_url),
            },
            query_input: "required name=search_term_string".to_string(),
        },
    };

    serde_json::to_string(&json_ld).unwrap_or_default()
}

pub fn generate_article_json_ld(post: &BlogPost, site_url: &str) -> String {
    let images: Vec<String> = post.featured_image
        .as_ref()
        .map(|img| vec![img.url.clone()])
        .unwrap_or_default();

    let json_ld = JsonLdArticle {
        context: "https://schema.org".to_string(),
        type_: "Article".to_string(),
        headline: post.title.clone(),
        description: post.excerpt.clone().unwrap_or_else(|| {
            post.content.chars().take(160).collect()
        }),
        image: images,
        author: JsonLdPerson {
            type_: "Person".to_string(),
            name: post.author.name.clone(),
            url: Some(format!("{}/authors/{}", site_url, post.author.slug)),
        },
        publisher: JsonLdPublisher {
            type_: "Organization".to_string(),
            name: "Spirom".to_string(),
            logo: JsonLdImageObject {
                type_: "ImageObject".to_string(),
                url: format!("{}/images/logo.png", site_url),
            },
        },
        date_published: post.published_at.clone(),
        date_modified: post.updated_at.clone(),
        main_entity_of_page: JsonLdWebPage {
            type_: "WebPage".to_string(),
            id: format!("{}/blog/{}", site_url, post.slug),
        },
    };

    serde_json::to_string(&json_ld).unwrap_or_default()
}

pub fn generate_sitemap_xml(urls: &[SitemapUrl]) -> String {
    let mut xml = String::from(r#"<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">"#);

    for url in urls {
        xml.push_str("\n  <url>\n");
        xml.push_str(&format!("    <loc>{}</loc>\n", escape_xml(&url.loc)));

        if let Some(ref lastmod) = url.lastmod {
            xml.push_str(&format!("    <lastmod>{}</lastmod>\n", lastmod));
        }

        if let Some(ref changefreq) = url.changefreq {
            xml.push_str(&format!("    <changefreq>{}</changefreq>\n", changefreq));
        }

        if let Some(priority) = url.priority {
            xml.push_str(&format!("    <priority>{:.1}</priority>\n", priority));
        }

        xml.push_str("  </url>");
    }

    xml.push_str("\n</urlset>");
    xml
}

pub fn generate_sitemap_index(sitemaps: &[(&str, &str)], site_url: &str) -> String {
    let mut xml = String::from(r#"<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">"#);

    for (path, lastmod) in sitemaps {
        xml.push_str("\n  <sitemap>\n");
        xml.push_str(&format!("    <loc>{}{}</loc>\n", site_url, path));
        xml.push_str(&format!("    <lastmod>{}</lastmod>\n", lastmod));
        xml.push_str("  </sitemap>");
    }

    xml.push_str("\n</sitemapindex>");
    xml
}

pub fn generate_robots_txt(site_url: &str) -> String {
    format!(
        r#"User-agent: *
Allow: /

Sitemap: {}/sitemap.xml

# Disallow admin and private areas
Disallow: /api/
Disallow: /admin/
Disallow: /checkout/
Disallow: /cart/
Disallow: /account/

# Allow specific API endpoints for SEO
Allow: /api/v1/products
Allow: /api/v1/categories

# Crawl-delay for polite crawlers
Crawl-delay: 1
"#,
        site_url
    )
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
