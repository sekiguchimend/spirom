use serde::{Deserialize, Serialize};

/// ページネーションメタデータ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationMeta {
    pub page: i32,
    pub per_page: i32,
    pub total: i64,
    pub total_pages: i32,
}

impl PaginationMeta {
    pub fn new(page: i32, per_page: i32, total: i64) -> Self {
        let total_pages = ((total as f64) / (per_page as f64)).ceil() as i32;
        Self {
            page,
            per_page,
            total,
            total_pages,
        }
    }
}

/// ページネーション付きレスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub meta: PaginationMeta,
}

impl<T> PaginatedResponse<T> {
    pub fn new(data: Vec<T>, page: i32, per_page: i32, total: i64) -> Self {
        Self {
            data,
            meta: PaginationMeta::new(page, per_page, total),
        }
    }
}

/// 単一データレスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataResponse<T> {
    pub data: T,
}

impl<T> DataResponse<T> {
    pub fn new(data: T) -> Self {
        Self { data }
    }
}

/// ページネーションクエリパラメータ
#[derive(Debug, Clone, Deserialize)]
pub struct PaginationQuery {
    #[serde(default = "default_page")]
    pub page: i32,
    #[serde(default = "default_per_page")]
    pub per_page: i32,
}

fn default_page() -> i32 {
    1
}

fn default_per_page() -> i32 {
    20
}

impl PaginationQuery {
    pub fn offset(&self) -> i64 {
        ((self.page - 1) * self.per_page) as i64
    }

    pub fn limit(&self) -> i32 {
        self.per_page.min(100)
    }
}

/// ソート順
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum SortOrder {
    Asc,
    #[default]
    Desc,
}

/// 通貨
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub enum Currency {
    #[default]
    JPY,
    USD,
    EUR,
}

impl std::fmt::Display for Currency {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Currency::JPY => write!(f, "JPY"),
            Currency::USD => write!(f, "USD"),
            Currency::EUR => write!(f, "EUR"),
        }
    }
}
