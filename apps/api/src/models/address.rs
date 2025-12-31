use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::{Validate, ValidationError};

/// 日本の都道府県リスト（ホワイトリスト）
pub const VALID_PREFECTURES: &[&str] = &[
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

/// 都道府県のバリデーション関数
fn validate_prefecture(value: &str) -> Result<(), ValidationError> {
    if VALID_PREFECTURES.contains(&value) {
        Ok(())
    } else {
        let mut err = ValidationError::new("invalid_prefecture");
        err.message = Some("正しい都道府県を選択してください".into());
        Err(err)
    }
}

/// 郵便番号のバリデーション関数（7桁の数字のみ）
fn validate_postal_code_format(value: &str) -> Result<(), ValidationError> {
    let normalized = value.replace('-', "");
    if normalized.len() == 7 && normalized.chars().all(|c| c.is_ascii_digit()) {
        Ok(())
    } else {
        let mut err = ValidationError::new("invalid_postal_code");
        err.message = Some("郵便番号は7桁の数字で入力してください".into());
        Err(err)
    }
}

/// 電話番号のバリデーション関数（10-11桁の数字、ハイフン可）
fn validate_phone_format(value: &str) -> Result<(), ValidationError> {
    let normalized: String = value.chars().filter(|c| c.is_ascii_digit()).collect();
    if normalized.len() >= 10 && normalized.len() <= 11 {
        Ok(())
    } else {
        let mut err = ValidationError::new("invalid_phone");
        err.message = Some("電話番号は10桁または11桁の数字で入力してください".into());
        Err(err)
    }
}

/// 危険な文字列を検出（XSS、SQLインジェクション対策）
fn contains_dangerous_chars(value: &str) -> bool {
    let dangerous_patterns = [
        "<script",
        "javascript:",
        "onerror=",
        "onclick=",
        "eval(",
        "expression(",
        "vbscript:",
        "data:text/html",
    ];
    let lower = value.to_lowercase();
    dangerous_patterns.iter().any(|pattern| lower.contains(pattern))
}

/// 文字列のサニタイゼーション（先頭・末尾の空白削除、連続空白の正規化）
fn sanitize_string(value: &str) -> String {
    value.trim().split_whitespace().collect::<Vec<&str>>().join(" ")
}

/// 住所
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Address {
    pub id: Uuid,
    pub user_id: Uuid,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    pub postal_code: String,
    pub prefecture: String,
    pub city: String,
    pub address_line1: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address_line2: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
}

/// 住所作成リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateAddressRequest {
    #[validate(length(max = 50))]
    pub label: Option<String>,
    #[validate(length(min = 7, max = 8), custom(function = "validate_postal_code_format"))]
    pub postal_code: String,
    #[validate(length(min = 1, max = 10), custom(function = "validate_prefecture"))]
    pub prefecture: String,
    #[validate(length(min = 1, max = 100))]
    pub city: String,
    #[validate(length(min = 1, max = 200))]
    pub address_line1: String,
    #[validate(length(max = 200))]
    pub address_line2: Option<String>,
    #[validate(length(max = 20), custom(function = "validate_phone_format"))]
    pub phone: Option<String>,
    #[serde(default)]
    pub is_default: bool,
}

impl CreateAddressRequest {
    /// リクエストのサニタイゼーションと追加バリデーション
    pub fn sanitize_and_validate(&mut self) -> Result<(), String> {
        // サニタイゼーション
        if let Some(ref mut label) = self.label {
            *label = sanitize_string(label);
            if contains_dangerous_chars(label) {
                return Err("ラベルに無効な文字が含まれています".to_string());
            }
        }

        self.postal_code = sanitize_string(&self.postal_code);
        if contains_dangerous_chars(&self.postal_code) {
            return Err("郵便番号に無効な文字が含まれています".to_string());
        }

        self.prefecture = sanitize_string(&self.prefecture);
        if contains_dangerous_chars(&self.prefecture) {
            return Err("都道府県に無効な文字が含まれています".to_string());
        }

        self.city = sanitize_string(&self.city);
        if contains_dangerous_chars(&self.city) {
            return Err("市区町村に無効な文字が含まれています".to_string());
        }

        self.address_line1 = sanitize_string(&self.address_line1);
        if contains_dangerous_chars(&self.address_line1) {
            return Err("番地・建物名に無効な文字が含まれています".to_string());
        }

        if let Some(ref mut address_line2) = self.address_line2 {
            *address_line2 = sanitize_string(address_line2);
            if contains_dangerous_chars(address_line2) {
                return Err("建物名・部屋番号に無効な文字が含まれています".to_string());
            }
        }

        if let Some(ref mut phone) = self.phone {
            *phone = sanitize_string(phone);
            if contains_dangerous_chars(phone) {
                return Err("電話番号に無効な文字が含まれています".to_string());
            }
        }

        Ok(())
    }
}

/// 住所更新リクエスト
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateAddressRequest {
    #[validate(length(max = 50))]
    pub label: Option<String>,
    #[validate(length(min = 7, max = 8), custom(function = "validate_postal_code_format"))]
    pub postal_code: Option<String>,
    #[validate(length(min = 1, max = 10), custom(function = "validate_prefecture"))]
    pub prefecture: Option<String>,
    #[validate(length(min = 1, max = 100))]
    pub city: Option<String>,
    #[validate(length(min = 1, max = 200))]
    pub address_line1: Option<String>,
    #[validate(length(max = 200))]
    pub address_line2: Option<String>,
    #[validate(length(max = 20), custom(function = "validate_phone_format"))]
    pub phone: Option<String>,
    pub is_default: Option<bool>,
}

impl UpdateAddressRequest {
    /// リクエストのサニタイゼーションと追加バリデーション
    pub fn sanitize_and_validate(&mut self) -> Result<(), String> {
        // サニタイゼーション
        if let Some(ref mut label) = self.label {
            *label = sanitize_string(label);
            if contains_dangerous_chars(label) {
                return Err("ラベルに無効な文字が含まれています".to_string());
            }
        }

        if let Some(ref mut postal_code) = self.postal_code {
            *postal_code = sanitize_string(postal_code);
            if contains_dangerous_chars(postal_code) {
                return Err("郵便番号に無効な文字が含まれています".to_string());
            }
        }

        if let Some(ref mut prefecture) = self.prefecture {
            *prefecture = sanitize_string(prefecture);
            if contains_dangerous_chars(prefecture) {
                return Err("都道府県に無効な文字が含まれています".to_string());
            }
        }

        if let Some(ref mut city) = self.city {
            *city = sanitize_string(city);
            if contains_dangerous_chars(city) {
                return Err("市区町村に無効な文字が含まれています".to_string());
            }
        }

        if let Some(ref mut address_line1) = self.address_line1 {
            *address_line1 = sanitize_string(address_line1);
            if contains_dangerous_chars(address_line1) {
                return Err("番地・建物名に無効な文字が含まれています".to_string());
            }
        }

        if let Some(ref mut address_line2) = self.address_line2 {
            *address_line2 = sanitize_string(address_line2);
            if contains_dangerous_chars(address_line2) {
                return Err("建物名・部屋番号に無効な文字が含まれています".to_string());
            }
        }

        if let Some(ref mut phone) = self.phone {
            *phone = sanitize_string(phone);
            if contains_dangerous_chars(phone) {
                return Err("電話番号に無効な文字が含まれています".to_string());
            }
        }

        Ok(())
    }
}

/// 注文用住所（埋め込み）
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OrderAddress {
    pub name: String,
    pub postal_code: String,
    pub prefecture: String,
    pub city: String,
    pub address_line1: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address_line2: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
}

impl OrderAddress {
    pub fn from_address(address: &Address, name: String) -> Self {
        Self {
            name,
            postal_code: address.postal_code.clone(),
            prefecture: address.prefecture.clone(),
            city: address.city.clone(),
            address_line1: address.address_line1.clone(),
            address_line2: address.address_line2.clone(),
            phone: address.phone.clone(),
        }
    }
}
