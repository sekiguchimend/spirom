use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::AuthenticatedClient;
use crate::error::Result;
use crate::models::{Address, User, UserRole};

pub struct UserRepository {
    client: AuthenticatedClient,
}

impl UserRepository {
    pub fn new(client: AuthenticatedClient) -> Self {
        Self { client }
    }

    /// ユーザー作成
    pub async fn create(&self, user: &User) -> Result<User> {
        let input = UserInput {
            id: user.id,
            email: user.email.clone(),
            password_hash: user.password_hash.clone(),
            name: user.name.clone(),
            phone: user.phone.clone(),
            is_active: user.is_active,
            is_verified: user.is_verified,
            role: user.role.to_string(),
            created_at: user.created_at,
            updated_at: user.updated_at,
            last_login_at: user.last_login_at,
        };

        let result: UserRow = self.client.insert("users", &input).await?;
        Ok(result.into_user())
    }

    /// IDでユーザー取得
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>> {
        let query = format!("id=eq.{}", id);
        let result: Option<UserRow> = self.client.select_single("users", &query).await?;
        Ok(result.map(|r| r.into_user()))
    }

    /// メールでユーザー取得
    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>> {
        let query = format!("email=eq.{}", urlencoding::encode(email));
        let result: Option<UserRow> = self.client.select_single("users", &query).await?;
        Ok(result.map(|r| r.into_user()))
    }

    /// メールが既に存在するか確認
    pub async fn email_exists(&self, email: &str) -> Result<bool> {
        let query = format!("email=eq.{}&select=id", urlencoding::encode(email));
        let results: Vec<IdOnly> = self.client.select("users", &query).await?;
        Ok(!results.is_empty())
    }

    /// ユーザー更新
    pub async fn update(&self, user: &User) -> Result<()> {
        let query = format!("id=eq.{}", user.id);
        let update = UserUpdate {
            name: user.name.clone(),
            phone: user.phone.clone(),
            is_active: user.is_active,
            is_verified: user.is_verified,
            updated_at: user.updated_at,
            last_login_at: user.last_login_at,
        };

        let _: Vec<UserRow> = self.client.update("users", &query, &update).await?;
        Ok(())
    }

    /// パスワード更新
    pub async fn update_password(&self, id: Uuid, password_hash: &str) -> Result<()> {
        let query = format!("id=eq.{}", id);
        let update = PasswordUpdate {
            password_hash: password_hash.to_string(),
            updated_at: Utc::now(),
        };

        let _: Vec<UserRow> = self.client.update("users", &query, &update).await?;
        Ok(())
    }

    /// 最終ログイン時刻更新
    pub async fn update_last_login(&self, id: Uuid) -> Result<()> {
        let now = Utc::now();
        let query = format!("id=eq.{}", id);
        let update = LastLoginUpdate {
            last_login_at: Some(now),
            updated_at: now,
        };

        let _: Vec<UserRow> = self.client.update("users", &query, &update).await?;
        Ok(())
    }

    /// 全ユーザー取得（管理者用）
    pub async fn find_all(&self, limit: i32) -> Result<Vec<User>> {
        let query = format!("order=created_at.desc&limit={}", limit);
        let results: Vec<UserRow> = self.client.select("users", &query).await?;
        Ok(results.into_iter().map(|r| r.into_user()).collect())
    }
}

// 住所リポジトリ
impl UserRepository {
    /// 住所作成
    pub async fn create_address(&self, address: &Address) -> Result<Address> {
        // デフォルト住所の場合、他の住所のデフォルトを解除
        if address.is_default {
            let query = format!("user_id=eq.{}", address.user_id);
            let update = DefaultUpdate { is_default: false };
            let _: Vec<AddressRow> = self.client.update("addresses", &query, &update).await?;
        }

        let input = AddressInput {
            id: address.id,
            user_id: address.user_id,
            label: address.label.clone(),
            postal_code: address.postal_code.clone(),
            prefecture: address.prefecture.clone(),
            city: address.city.clone(),
            address_line1: address.address_line1.clone(),
            address_line2: address.address_line2.clone(),
            phone: address.phone.clone(),
            is_default: address.is_default,
            created_at: address.created_at,
        };

        let result: AddressRow = self.client.insert("addresses", &input).await?;
        Ok(result.into_address())
    }

    /// ユーザーの住所一覧取得
    pub async fn find_addresses_by_user(&self, user_id: Uuid) -> Result<Vec<Address>> {
        let query = format!("user_id=eq.{}&order=is_default.desc,created_at.desc", user_id);
        let results: Vec<AddressRow> = self.client.select("addresses", &query).await?;
        Ok(results.into_iter().map(|r| r.into_address()).collect())
    }

    /// 住所取得
    pub async fn find_address(&self, user_id: Uuid, id: Uuid) -> Result<Option<Address>> {
        let query = format!("user_id=eq.{}&id=eq.{}", user_id, id);
        let result: Option<AddressRow> = self.client.select_single("addresses", &query).await?;
        Ok(result.map(|r| r.into_address()))
    }

    /// 住所削除
    pub async fn delete_address(&self, user_id: Uuid, id: Uuid) -> Result<()> {
        let query = format!("user_id=eq.{}&id=eq.{}", user_id, id);
        self.client.delete("addresses", &query).await
    }
}

// Supabase REST API用の構造体
#[derive(Debug, Serialize)]
struct UserInput {
    id: Uuid,
    email: String,
    password_hash: String,
    name: String,
    phone: Option<String>,
    is_active: bool,
    is_verified: bool,
    role: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    last_login_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
struct UserUpdate {
    name: String,
    phone: Option<String>,
    is_active: bool,
    is_verified: bool,
    updated_at: DateTime<Utc>,
    last_login_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
struct PasswordUpdate {
    password_hash: String,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct LastLoginUpdate {
    last_login_at: Option<DateTime<Utc>>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct UserRow {
    id: Uuid,
    email: String,
    password_hash: String,
    name: String,
    phone: Option<String>,
    is_active: bool,
    is_verified: bool,
    role: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    last_login_at: Option<DateTime<Utc>>,
}

impl UserRow {
    fn into_user(self) -> User {
        User {
            id: self.id,
            email: self.email,
            password_hash: self.password_hash,
            name: self.name,
            phone: self.phone,
            is_active: self.is_active,
            is_verified: self.is_verified,
            role: self.role.parse().unwrap_or(UserRole::User),
            created_at: self.created_at,
            updated_at: self.updated_at,
            last_login_at: self.last_login_at,
        }
    }
}

#[derive(Debug, Deserialize)]
struct IdOnly {
    #[allow(dead_code)]
    id: Uuid,
}

#[derive(Debug, Serialize)]
struct AddressInput {
    id: Uuid,
    user_id: Uuid,
    label: Option<String>,
    postal_code: String,
    prefecture: String,
    city: String,
    address_line1: String,
    address_line2: Option<String>,
    phone: Option<String>,
    is_default: bool,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct DefaultUpdate {
    is_default: bool,
}

#[derive(Debug, Deserialize)]
struct AddressRow {
    id: Uuid,
    user_id: Uuid,
    label: Option<String>,
    postal_code: String,
    prefecture: String,
    city: String,
    address_line1: String,
    address_line2: Option<String>,
    phone: Option<String>,
    is_default: bool,
    created_at: DateTime<Utc>,
}

impl AddressRow {
    fn into_address(self) -> Address {
        Address {
            id: self.id,
            user_id: self.user_id,
            label: self.label,
            postal_code: self.postal_code,
            prefecture: self.prefecture,
            city: self.city,
            address_line1: self.address_line1,
            address_line2: self.address_line2,
            phone: self.phone,
            is_default: self.is_default,
            created_at: self.created_at,
        }
    }
}
