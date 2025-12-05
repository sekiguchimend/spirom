use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SitemapUrl {
    pub loc: String,
    pub lastmod: Option<String>,
    pub changefreq: Option<ChangeFreq>,
    pub priority: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChangeFreq {
    Always,
    Hourly,
    Daily,
    Weekly,
    Monthly,
    Yearly,
    Never,
}

impl std::fmt::Display for ChangeFreq {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ChangeFreq::Always => write!(f, "always"),
            ChangeFreq::Hourly => write!(f, "hourly"),
            ChangeFreq::Daily => write!(f, "daily"),
            ChangeFreq::Weekly => write!(f, "weekly"),
            ChangeFreq::Monthly => write!(f, "monthly"),
            ChangeFreq::Yearly => write!(f, "yearly"),
            ChangeFreq::Never => write!(f, "never"),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdProduct {
    #[serde(rename = "@context")]
    pub context: String,
    #[serde(rename = "@type")]
    pub type_: String,
    pub name: String,
    pub description: String,
    pub image: Vec<String>,
    pub sku: String,
    pub brand: JsonLdBrand,
    pub offers: JsonLdOffer,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aggregate_rating: Option<JsonLdAggregateRating>,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdBrand {
    #[serde(rename = "@type")]
    pub type_: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdOffer {
    #[serde(rename = "@type")]
    pub type_: String,
    pub url: String,
    pub price_currency: String,
    pub price: String,
    pub availability: String,
    pub item_condition: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdAggregateRating {
    #[serde(rename = "@type")]
    pub type_: String,
    pub rating_value: f32,
    pub review_count: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdBreadcrumbList {
    #[serde(rename = "@context")]
    pub context: String,
    #[serde(rename = "@type")]
    pub type_: String,
    #[serde(rename = "itemListElement")]
    pub item_list_element: Vec<JsonLdListItem>,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdListItem {
    #[serde(rename = "@type")]
    pub type_: String,
    pub position: u32,
    pub name: String,
    pub item: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdOrganization {
    #[serde(rename = "@context")]
    pub context: String,
    #[serde(rename = "@type")]
    pub type_: String,
    pub name: String,
    pub url: String,
    pub logo: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub same_as: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contact_point: Option<JsonLdContactPoint>,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdContactPoint {
    #[serde(rename = "@type")]
    pub type_: String,
    pub telephone: String,
    pub contact_type: String,
    pub area_served: String,
    pub available_language: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdArticle {
    #[serde(rename = "@context")]
    pub context: String,
    #[serde(rename = "@type")]
    pub type_: String,
    pub headline: String,
    pub description: String,
    pub image: Vec<String>,
    pub author: JsonLdPerson,
    pub publisher: JsonLdPublisher,
    pub date_published: String,
    pub date_modified: String,
    #[serde(rename = "mainEntityOfPage")]
    pub main_entity_of_page: JsonLdWebPage,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdPerson {
    #[serde(rename = "@type")]
    pub type_: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdPublisher {
    #[serde(rename = "@type")]
    pub type_: String,
    pub name: String,
    pub logo: JsonLdImageObject,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdImageObject {
    #[serde(rename = "@type")]
    pub type_: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdWebPage {
    #[serde(rename = "@type")]
    pub type_: String,
    #[serde(rename = "@id")]
    pub id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdWebSite {
    #[serde(rename = "@context")]
    pub context: String,
    #[serde(rename = "@type")]
    pub type_: String,
    pub name: String,
    pub url: String,
    pub potential_action: JsonLdSearchAction,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdSearchAction {
    #[serde(rename = "@type")]
    pub type_: String,
    pub target: JsonLdEntryPoint,
    #[serde(rename = "query-input")]
    pub query_input: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct JsonLdEntryPoint {
    #[serde(rename = "@type")]
    pub type_: String,
    pub url_template: String,
}
