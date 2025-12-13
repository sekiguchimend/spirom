use reqwest::{Client, header};
use serde::{de::DeserializeOwned, Serialize};
use crate::error::{AppError, Result};

/// Supabase REST APIクライアント
/// anon keyまたはservice_role keyを使用してアクセスを行う
#[derive(Clone)]
pub struct SupabaseClient {
    client: Client,
    url: String,
    anon_key: String,
    service_role_key: Option<String>,
}

impl SupabaseClient {
    pub fn new(url: &str, anon_key: &str) -> Result<Self> {
        let service_role_key = std::env::var("SUPABASE_SERVICE_ROLE_KEY").ok();
        let client = Client::builder()
            .build()
            .map_err(|e| AppError::Database(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            client,
            url: url.trim_end_matches('/').to_string(),
            anon_key: anon_key.to_string(),
            service_role_key,
        })
    }

    /// 認証済みユーザー用のクライアントを作成（JWTを使用）
    pub fn with_auth(&self, jwt: &str) -> AuthenticatedClient {
        AuthenticatedClient {
            client: self.client.clone(),
            url: self.url.clone(),
            anon_key: self.anon_key.clone(),
            jwt: Some(jwt.to_string()),
        }
    }

    /// 匿名アクセス用のクライアント
    pub fn anonymous(&self) -> AuthenticatedClient {
        AuthenticatedClient {
            client: self.client.clone(),
            url: self.url.clone(),
            anon_key: self.anon_key.clone(),
            jwt: None,
        }
    }

    /// サービスロール用のクライアント（RLSをバイパス）
    pub fn service(&self) -> AuthenticatedClient {
        AuthenticatedClient {
            client: self.client.clone(),
            url: self.url.clone(),
            anon_key: self.service_role_key.clone().unwrap_or_else(|| self.anon_key.clone()),
            jwt: None,
        }
    }

    /// ヘルスチェック
    pub async fn health_check(&self) -> Result<bool> {
        let response = self.client
            .get(&format!("{}/rest/v1/", self.url))
            .header("apikey", &self.anon_key)
            .send()
            .await
            .map_err(|e| AppError::Database(format!("Health check failed: {}", e)))?;

        Ok(response.status().is_success())
    }
}

/// 認証状態を持つSupabaseクライアント
#[derive(Clone)]
pub struct AuthenticatedClient {
    client: Client,
    url: String,
    anon_key: String,
    jwt: Option<String>,
}

impl AuthenticatedClient {
    /// 共通ヘッダーを設定
    fn headers(&self) -> Result<header::HeaderMap> {
        let mut headers = header::HeaderMap::new();
        headers.insert(
            "apikey",
            self.anon_key
                .parse()
                .map_err(|e| AppError::Database(format!("Invalid apikey header value: {}", e)))?,
        );
        headers.insert(
            "Content-Type",
            "application/json"
                .parse()
                .map_err(|e| AppError::Database(format!("Invalid content-type header value: {}", e)))?,
        );
        headers.insert(
            "Prefer",
            "return=representation"
                .parse()
                .map_err(|e| AppError::Database(format!("Invalid prefer header value: {}", e)))?,
        );

        // Supabase(PostgREST)は `apikey` に加えて `Authorization: Bearer ...` を要求する。
        // - jwt がある場合: そのJWTを使う
        // - jwt がない場合(anon/service): APIキー自体を Bearer として送る
        let bearer = self.jwt.as_deref().unwrap_or(&self.anon_key);
        headers.insert(
            "Authorization",
            format!("Bearer {}", bearer)
                .parse()
                .map_err(|e| AppError::Database(format!("Invalid authorization header value: {}", e)))?,
        );

        Ok(headers)
    }

    /// SELECT: データ取得
    pub async fn select<T: DeserializeOwned>(
        &self,
        table: &str,
        query: &str,
    ) -> Result<Vec<T>> {
        let url = format!("{}/rest/v1/{}?{}", self.url, table, query);

        let response = self.client
            .get(&url)
            .headers(self.headers()?)
            .send()
            .await
            .map_err(|e| AppError::Database(format!("Select failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Database(format!("Select error: {}", error_text)));
        }

        response.json::<Vec<T>>()
            .await
            .map_err(|e| AppError::Database(format!("Parse error: {}", e)))
    }

    /// SELECT: 単一レコード取得
    pub async fn select_single<T: DeserializeOwned>(
        &self,
        table: &str,
        query: &str,
    ) -> Result<Option<T>> {
        let url = format!("{}/rest/v1/{}?{}", self.url, table, query);

        let mut headers = self.headers()?;
        headers.insert(
            "Accept",
            "application/vnd.pgrst.object+json"
                .parse()
                .map_err(|e| AppError::Database(format!("Invalid accept header value: {}", e)))?,
        );

        let response = self.client
            .get(&url)
            .headers(headers)
            .send()
            .await
            .map_err(|e| AppError::Database(format!("Select failed: {}", e)))?;

        if response.status().as_u16() == 406 {
            // Not Acceptable = レコードなし
            return Ok(None);
        }

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Database(format!("Select error: {}", error_text)));
        }

        let result = response.json::<T>()
            .await
            .map_err(|e| AppError::Database(format!("Parse error: {}", e)))?;

        Ok(Some(result))
    }

    /// INSERT: データ挿入
    pub async fn insert<T: Serialize, R: DeserializeOwned>(
        &self,
        table: &str,
        data: &T,
    ) -> Result<R> {
        let url = format!("{}/rest/v1/{}", self.url, table);

        let response = self.client
            .post(&url)
            .headers(self.headers()?)
            .json(data)
            .send()
            .await
            .map_err(|e| AppError::Database(format!("Insert failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Database(format!("Insert error: {}", error_text)));
        }

        // 配列で返ってくるので最初の要素を取得
        let results: Vec<R> = response.json()
            .await
            .map_err(|e| AppError::Database(format!("Parse error: {}", e)))?;

        results.into_iter().next()
            .ok_or_else(|| AppError::Database("No data returned".to_string()))
    }

    /// UPDATE: データ更新
    pub async fn update<T: Serialize, R: DeserializeOwned>(
        &self,
        table: &str,
        query: &str,
        data: &T,
    ) -> Result<Vec<R>> {
        let url = format!("{}/rest/v1/{}?{}", self.url, table, query);

        let response = self.client
            .patch(&url)
            .headers(self.headers()?)
            .json(data)
            .send()
            .await
            .map_err(|e| AppError::Database(format!("Update failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Database(format!("Update error: {}", error_text)));
        }

        response.json::<Vec<R>>()
            .await
            .map_err(|e| AppError::Database(format!("Parse error: {}", e)))
    }

    /// DELETE: データ削除
    pub async fn delete(&self, table: &str, query: &str) -> Result<()> {
        let url = format!("{}/rest/v1/{}?{}", self.url, table, query);

        let response = self.client
            .delete(&url)
            .headers(self.headers()?)
            .send()
            .await
            .map_err(|e| AppError::Database(format!("Delete failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Database(format!("Delete error: {}", error_text)));
        }

        Ok(())
    }

    /// UPSERT: データ挿入または更新
    pub async fn upsert<T: Serialize, R: DeserializeOwned>(
        &self,
        table: &str,
        data: &T,
        on_conflict: &str,
    ) -> Result<R> {
        let url = format!("{}/rest/v1/{}", self.url, table);

        let mut headers = self.headers()?;
        headers.insert(
            "Prefer",
            format!("resolution=merge-duplicates,return=representation")
                .parse()
                .map_err(|e| AppError::Database(format!("Invalid prefer header value: {}", e)))?,
        );

        let response = self.client
            .post(&url)
            .headers(headers)
            .header("On-Conflict", on_conflict)
            .json(data)
            .send()
            .await
            .map_err(|e| AppError::Database(format!("Upsert failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Database(format!("Upsert error: {}", error_text)));
        }

        let results: Vec<R> = response.json()
            .await
            .map_err(|e| AppError::Database(format!("Parse error: {}", e)))?;

        results.into_iter().next()
            .ok_or_else(|| AppError::Database("No data returned".to_string()))
    }

    /// RPC: ストアドプロシージャ呼び出し
    pub async fn rpc<T: Serialize, R: DeserializeOwned>(
        &self,
        function_name: &str,
        params: &T,
    ) -> Result<R> {
        let url = format!("{}/rest/v1/rpc/{}", self.url, function_name);

        let response = self.client
            .post(&url)
            .headers(self.headers()?)
            .json(params)
            .send()
            .await
            .map_err(|e| AppError::Database(format!("RPC failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Database(format!("RPC error: {}", error_text)));
        }

        response.json::<R>()
            .await
            .map_err(|e| AppError::Database(format!("Parse error: {}", e)))
    }
}
