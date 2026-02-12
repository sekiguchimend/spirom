use axum::{extract::State, Extension, Json};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::config::AppState;
use crate::error::{AppError, Result};
use crate::models::AuthenticatedUser;

/// MFA登録開始レスポンス
#[derive(Debug, Serialize)]
pub struct MfaEnrollResponse {
    pub id: String,
    pub totp: TotpInfo,
    pub friendly_name: String,
}

#[derive(Debug, Serialize)]
pub struct TotpInfo {
    pub qr_code: String,
    pub secret: String,
    pub uri: String,
}

/// MFA検証リクエスト
#[derive(Debug, Deserialize)]
pub struct MfaVerifyRequest {
    pub factor_id: String,
    pub code: String,
}

/// MFAチャレンジリクエスト
#[derive(Debug, Deserialize)]
pub struct MfaChallengeRequest {
    pub factor_id: String,
}

/// MFAチャレンジレスポンス
#[derive(Debug, Serialize)]
pub struct MfaChallengeResponse {
    pub id: String,
    pub expires_at: i64,
}

/// MFA要素削除リクエスト
#[derive(Debug, Deserialize)]
pub struct MfaUnenrollRequest {
    pub factor_id: String,
}

/// MFA要素一覧レスポンス
#[derive(Debug, Serialize, Deserialize)]
pub struct MfaFactor {
    pub id: String,
    pub friendly_name: Option<String>,
    pub factor_type: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

/// MFA登録開始（QRコード生成）
pub async fn enroll(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
) -> Result<Json<MfaEnrollResponse>> {
    let client = Client::new();
    let url = format!(
        "{}/auth/v1/factors",
        state.config.database.url.trim_end_matches('/')
    );

    let body = serde_json::json!({
        "friendly_name": "authenticator",
        "factor_type": "totp"
    });

    let res = client
        .post(&url)
        .header("apikey", &state.config.database.anon_key)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("MFA enroll request failed: {}", e)))?;

    if !res.status().is_success() {
        let txt = res.text().await.unwrap_or_default();
        return Err(AppError::BadRequest(format!("MFA登録に失敗しました: {}", txt)));
    }

    let data: Value = res
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("MFA enroll parse failed: {}", e)))?;

    let response = MfaEnrollResponse {
        id: data["id"].as_str().unwrap_or("").to_string(),
        totp: TotpInfo {
            qr_code: data["totp"]["qr_code"].as_str().unwrap_or("").to_string(),
            secret: data["totp"]["secret"].as_str().unwrap_or("").to_string(),
            uri: data["totp"]["uri"].as_str().unwrap_or("").to_string(),
        },
        friendly_name: data["friendly_name"].as_str().unwrap_or("authenticator").to_string(),
    };

    Ok(Json(response))
}

/// MFAチャレンジ作成
pub async fn challenge(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Json(req): Json<MfaChallengeRequest>,
) -> Result<Json<MfaChallengeResponse>> {
    let client = Client::new();
    let url = format!(
        "{}/auth/v1/factors/{}/challenge",
        state.config.database.url.trim_end_matches('/'),
        req.factor_id
    );

    let res = client
        .post(&url)
        .header("apikey", &state.config.database.anon_key)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("MFA challenge request failed: {}", e)))?;

    if !res.status().is_success() {
        let txt = res.text().await.unwrap_or_default();
        return Err(AppError::BadRequest(format!("MFAチャレンジに失敗しました: {}", txt)));
    }

    let data: Value = res
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("MFA challenge parse failed: {}", e)))?;

    let response = MfaChallengeResponse {
        id: data["id"].as_str().unwrap_or("").to_string(),
        expires_at: data["expires_at"].as_i64().unwrap_or(0),
    };

    Ok(Json(response))
}

/// MFA検証（TOTPコード確認）
pub async fn verify(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Json(req): Json<MfaVerifyRequest>,
) -> Result<Json<Value>> {
    let client = Client::new();

    // まずチャレンジを作成
    let challenge_url = format!(
        "{}/auth/v1/factors/{}/challenge",
        state.config.database.url.trim_end_matches('/'),
        req.factor_id
    );

    let challenge_res = client
        .post(&challenge_url)
        .header("apikey", &state.config.database.anon_key)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("MFA challenge request failed: {}", e)))?;

    if !challenge_res.status().is_success() {
        let txt = challenge_res.text().await.unwrap_or_default();
        return Err(AppError::BadRequest(format!("MFAチャレンジに失敗しました: {}", txt)));
    }

    let challenge_data: Value = challenge_res
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("MFA challenge parse failed: {}", e)))?;

    let challenge_id = challenge_data["id"].as_str().unwrap_or("");

    // チャレンジを検証
    let verify_url = format!(
        "{}/auth/v1/factors/{}/verify",
        state.config.database.url.trim_end_matches('/'),
        req.factor_id
    );

    let body = serde_json::json!({
        "challenge_id": challenge_id,
        "code": req.code
    });

    let res = client
        .post(&verify_url)
        .header("apikey", &state.config.database.anon_key)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("MFA verify request failed: {}", e)))?;

    if !res.status().is_success() {
        let txt = res.text().await.unwrap_or_default();
        return Err(AppError::Unauthorized(format!("認証コードが正しくありません: {}", txt)));
    }

    let data: Value = res
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("MFA verify parse failed: {}", e)))?;

    Ok(Json(data))
}

/// MFA要素削除（2FA無効化）
pub async fn unenroll(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Json(req): Json<MfaUnenrollRequest>,
) -> Result<Json<Value>> {
    let client = Client::new();
    let url = format!(
        "{}/auth/v1/factors/{}",
        state.config.database.url.trim_end_matches('/'),
        req.factor_id
    );

    let res = client
        .delete(&url)
        .header("apikey", &state.config.database.anon_key)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("MFA unenroll request failed: {}", e)))?;

    if !res.status().is_success() {
        let txt = res.text().await.unwrap_or_default();
        return Err(AppError::BadRequest(format!("MFA無効化に失敗しました: {}", txt)));
    }

    Ok(Json(serde_json::json!({ "success": true })))
}

/// MFA要素一覧取得
pub async fn list_factors(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Extension(_auth_user): Extension<AuthenticatedUser>,
) -> Result<Json<Vec<MfaFactor>>> {
    let client = Client::new();
    let url = format!(
        "{}/auth/v1/factors",
        state.config.database.url.trim_end_matches('/')
    );

    let res = client
        .get(&url)
        .header("apikey", &state.config.database.anon_key)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("MFA list request failed: {}", e)))?;

    if !res.status().is_success() {
        let txt = res.text().await.unwrap_or_default();
        return Err(AppError::BadRequest(format!("MFA一覧取得に失敗しました: {}", txt)));
    }

    let factors: Vec<MfaFactor> = res
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("MFA list parse failed: {}", e)))?;

    Ok(Json(factors))
}
