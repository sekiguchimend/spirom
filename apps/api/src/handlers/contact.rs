use axum::{
    extract::{ConnectInfo, State, Query},
    http::HeaderMap,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use uuid::Uuid;
use validator::Validate;

use crate::config::AppState;
use crate::error::{AppError, Result};
use crate::models::AuthenticatedUser;

/// お問い合わせ種別
const VALID_INQUIRY_TYPES: [&str; 5] = ["order", "product", "shipping", "return", "other"];

/// お問い合わせ送信リクエスト
/// 注意: name/emailはリクエストから受け取らず、認証ユーザー情報から取得する
#[derive(Debug, Deserialize, Validate)]
pub struct ContactSubmissionRequest {
    #[validate(length(min = 1, max = 50))]
    pub inquiry_type: String,

    #[validate(length(max = 50))]
    pub order_number: Option<String>,

    #[validate(length(min = 10, max = 5000, message = "メッセージは10〜5000文字で入力してください"))]
    pub message: String,

    /// ハニーポットフィールド（スパムボット検出用）
    /// このフィールドが入力されていたらスパムと判定
    #[serde(default)]
    pub website: Option<String>,

    /// タイムスタンプ（ボット検出用）
    /// フォーム表示からの経過時間が短すぎる場合はボットと判定
    #[serde(default)]
    pub form_rendered_at: Option<i64>,
}

/// お問い合わせ送信レスポンス
#[derive(Debug, Serialize)]
pub struct ContactSubmissionResponse {
    pub success: bool,
    pub message: String,
    pub submission_id: String,
}

/// お問い合わせ一覧レスポンス（管理者用）
#[derive(Debug, Serialize, Deserialize)]
pub struct ContactSubmission {
    pub id: String,
    pub user_id: Option<String>,
    pub name: String,
    pub email: String,
    pub inquiry_type: String,
    pub order_number: Option<String>,
    pub message: String,
    pub status: String,
    pub admin_notes: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: String,
    pub read_at: Option<String>,
    pub replied_at: Option<String>,
}

/// 一覧取得クエリパラメータ
#[derive(Debug, Deserialize)]
pub struct ListContactQuery {
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// ステータス更新リクエスト
#[derive(Debug, Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
    pub admin_notes: Option<String>,
}

/// ユーザー情報（DBから取得用）
#[derive(Debug, Deserialize)]
struct UserInfo {
    name: Option<String>,
    email: String,
}

/// DB挿入用構造体
#[derive(Debug, Serialize)]
struct ContactInsert {
    id: String,
    user_id: String,
    name: String,
    email: String,
    inquiry_type: String,
    order_number: Option<String>,
    message: String,
    status: String,
    ip_address: Option<String>,
    user_agent: Option<String>,
}

/// DB更新用構造体
#[derive(Debug, Serialize)]
struct ContactUpdate {
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    read_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    replied_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    admin_notes: Option<String>,
}

/// お問い合わせ送信（認証ユーザーのみ）
/// セキュリティ:
/// - 認証必須
/// - ユーザー情報はDBから取得（リクエストを信用しない）
/// - バリデーション（長さ制限）
/// - ハニーポットフィールドでボット検出
/// - フォーム表示時間チェックでボット検出
/// - IPアドレス・User-Agent記録
/// - レート制限（ミドルウェアで適用）
pub async fn submit_contact(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthenticatedUser>,
    Extension(token): Extension<String>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(req): Json<ContactSubmissionRequest>,
) -> Result<Json<ContactSubmissionResponse>> {
    // 1. バリデーション
    req.validate().map_err(|e| {
        AppError::BadRequest(format!("入力エラー: {}", e))
    })?;

    // 2. inquiry_type のチェック
    if !VALID_INQUIRY_TYPES.contains(&req.inquiry_type.as_str()) {
        return Err(AppError::BadRequest("無効なお問い合わせ種別です".to_string()));
    }

    // 3. 認証済みユーザーの情報をDBから取得（リクエストボディを信用しない）
    // RLSポリシーで本人のみ閲覧可能
    let db = state.db.with_auth(&token);
    let user_info: Option<UserInfo> = db
        .select_single("users", &format!("id=eq.{}&select=name,email", auth_user.id))
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch user info: {}", e);
            AppError::Internal("ユーザー情報の取得に失敗しました".to_string())
        })?;

    let user_info = user_info.ok_or_else(|| {
        AppError::Unauthorized("ユーザーが見つかりません".to_string())
    })?;

    let user_name = user_info.name.unwrap_or_else(|| "名前未設定".to_string());
    let user_email = user_info.email;

    // 4. ハニーポットチェック（websiteフィールドが入力されていたらスパム）
    if req.website.as_ref().map(|s| !s.is_empty()).unwrap_or(false) {
        tracing::warn!(
            "Honeypot triggered: ip={}, user_id={}, email={}",
            addr.ip(),
            auth_user.id,
            user_email
        );
        // スパムでも成功レスポンスを返す（攻撃者に検出されないように）
        return Ok(Json(ContactSubmissionResponse {
            success: true,
            message: "お問い合わせを受け付けました。".to_string(),
            submission_id: Uuid::new_v4().to_string(),
        }));
    }

    // 5. フォーム表示時間チェック（3秒未満で送信したらボットの可能性）
    if let Some(rendered_at) = req.form_rendered_at {
        let now = chrono::Utc::now().timestamp_millis();
        let elapsed = now - rendered_at;
        if elapsed < 3000 {
            tracing::warn!(
                "Form submitted too quickly: ip={}, user_id={}, elapsed={}ms",
                addr.ip(),
                auth_user.id,
                elapsed
            );
            // 疑わしいが、一応保存はする（status: spam）
            let _ = save_submission(&state, &token, &auth_user.id, &user_name, &user_email, &req, &addr, &headers, "spam").await;
            return Ok(Json(ContactSubmissionResponse {
                success: true,
                message: "お問い合わせを受け付けました。".to_string(),
                submission_id: Uuid::new_v4().to_string(),
            }));
        }
    }

    // 6. 入力値のサニタイズ（XSS対策）
    let sanitized_message = sanitize_input(&req.message);
    let sanitized_order_number = req.order_number.as_ref().map(|s| sanitize_input(s));

    // 7. IPアドレス取得
    let client_ip = get_client_ip(&addr, &headers);

    // 8. User-Agent取得
    let user_agent = headers
        .get("User-Agent")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.chars().take(500).collect::<String>());

    // 9. DBに保存
    let submission_id = Uuid::new_v4();

    let insert_data = ContactInsert {
        id: submission_id.to_string(),
        user_id: auth_user.id.to_string(),
        name: sanitize_input(&user_name),
        email: user_email.to_lowercase().trim().to_string(),
        inquiry_type: req.inquiry_type.clone(),
        order_number: sanitized_order_number,
        message: sanitized_message,
        status: "unread".to_string(),
        ip_address: Some(client_ip),
        user_agent,
    };

    let _result: ContactSubmission = db
        .insert("contact_submissions", &insert_data)
        .await
        .map_err(|e| {
            tracing::error!("Failed to save contact submission: {}", e);
            AppError::Internal("お問い合わせの保存に失敗しました".to_string())
        })?;

    tracing::info!(
        "Contact submission saved: id={}, type={}, user_id={}, email={}",
        submission_id,
        req.inquiry_type,
        auth_user.id,
        user_email
    );

    Ok(Json(ContactSubmissionResponse {
        success: true,
        message: "お問い合わせを受け付けました。2〜3営業日以内にご返信いたします。".to_string(),
        submission_id: submission_id.to_string(),
    }))
}

/// スパム判定時の保存
async fn save_submission(
    state: &AppState,
    token: &str,
    user_id: &Uuid,
    user_name: &str,
    user_email: &str,
    req: &ContactSubmissionRequest,
    addr: &SocketAddr,
    headers: &HeaderMap,
    status: &str,
) -> Result<()> {
    let client_ip = get_client_ip(addr, headers);
    let user_agent = headers
        .get("User-Agent")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.chars().take(500).collect::<String>());

    // RLSポリシーで認証ユーザーのINSERTを許可
    let db = state.db.with_auth(token);

    let insert_data = ContactInsert {
        id: Uuid::new_v4().to_string(),
        user_id: user_id.to_string(),
        name: sanitize_input(user_name),
        email: user_email.to_lowercase().trim().to_string(),
        inquiry_type: req.inquiry_type.clone(),
        order_number: req.order_number.as_ref().map(|s| sanitize_input(s)),
        message: sanitize_input(&req.message),
        status: status.to_string(),
        ip_address: Some(client_ip),
        user_agent,
    };

    let _: ContactSubmission = db
        .insert("contact_submissions", &insert_data)
        .await
        .map_err(|e| {
            tracing::error!("Failed to save spam submission: {}", e);
            AppError::Internal("保存に失敗しました".to_string())
        })?;

    Ok(())
}

/// お問い合わせ一覧取得（管理者専用）
/// RLSポリシーで管理者のみ閲覧可能
pub async fn list_contacts(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    Query(query): Query<ListContactQuery>,
) -> Result<Json<Vec<ContactSubmission>>> {
    let db = state.db.with_auth(&token);

    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0);

    // クエリを構築
    let mut query_str = format!(
        "select=*&order=created_at.desc&limit={}&offset={}",
        limit, offset
    );

    if let Some(status) = &query.status {
        query_str.push_str(&format!("&status=eq.{}", status));
    }

    let submissions: Vec<ContactSubmission> = db
        .select("contact_submissions", &query_str)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to fetch contacts: {}", e)))?;

    Ok(Json(submissions))
}

/// お問い合わせ詳細取得（管理者専用）
/// RLSポリシーで管理者のみ閲覧可能
pub async fn get_contact(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<ContactSubmission>> {
    // UUIDバリデーション
    Uuid::parse_str(&id).map_err(|_| AppError::BadRequest("無効なIDです".to_string()))?;

    let db = state.db.with_auth(&token);

    let submission: Option<ContactSubmission> = db
        .select_single("contact_submissions", &format!("id=eq.{}&select=*", id))
        .await
        .map_err(|e| AppError::Internal(format!("Failed to fetch contact: {}", e)))?;

    submission
        .map(Json)
        .ok_or_else(|| AppError::NotFound("お問い合わせが見つかりません".to_string()))
}

/// ステータス更新（管理者専用）
/// RLSポリシーで管理者のみ更新可能
pub async fn update_contact_status(
    State(state): State<AppState>,
    Extension(token): Extension<String>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateStatusRequest>,
) -> Result<Json<ContactSubmission>> {
    // UUIDバリデーション
    Uuid::parse_str(&id).map_err(|_| AppError::BadRequest("無効なIDです".to_string()))?;

    // ステータスバリデーション
    let valid_statuses = ["unread", "read", "replied", "resolved", "spam"];
    if !valid_statuses.contains(&req.status.as_str()) {
        return Err(AppError::BadRequest("無効なステータスです".to_string()));
    }

    let db = state.db.with_auth(&token);

    // ステータスに応じてタイムスタンプを設定
    let read_at = if req.status == "read" {
        Some(chrono::Utc::now().to_rfc3339())
    } else {
        None
    };

    let replied_at = if req.status == "replied" {
        Some(chrono::Utc::now().to_rfc3339())
    } else {
        None
    };

    let update_data = ContactUpdate {
        status: req.status,
        read_at,
        replied_at,
        admin_notes: req.admin_notes.map(|n| sanitize_input(&n)),
    };

    let results: Vec<ContactSubmission> = db
        .update("contact_submissions", &format!("id=eq.{}", id), &update_data)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to update contact: {}", e)))?;

    results
        .into_iter()
        .next()
        .map(Json)
        .ok_or_else(|| AppError::NotFound("お問い合わせが見つかりません".to_string()))
}

/// 入力値のサニタイズ（基本的なXSS対策）
fn sanitize_input(input: &str) -> String {
    input
        .chars()
        .take(5000) // 最大長制限
        .collect::<String>()
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
        .trim()
        .to_string()
}

/// クライアントIP取得（X-Forwarded-For対応）
fn get_client_ip(addr: &SocketAddr, headers: &HeaderMap) -> String {
    // CF-Connecting-IP（Cloudflare）
    if let Some(cf_ip) = headers.get("CF-Connecting-IP").and_then(|h| h.to_str().ok()) {
        let cf_ip = cf_ip.trim();
        if !cf_ip.is_empty() {
            return cf_ip.to_string();
        }
    }

    // X-Real-IP
    if let Some(real_ip) = headers.get("X-Real-IP").and_then(|h| h.to_str().ok()) {
        let real_ip = real_ip.trim();
        if !real_ip.is_empty() {
            return real_ip.to_string();
        }
    }

    // X-Forwarded-For（最初のIP）
    if let Some(xff) = headers.get("X-Forwarded-For").and_then(|h| h.to_str().ok()) {
        if let Some(first_ip) = xff.split(',').next() {
            let first_ip = first_ip.trim();
            if !first_ip.is_empty() {
                return first_ip.to_string();
            }
        }
    }

    addr.ip().to_string()
}
