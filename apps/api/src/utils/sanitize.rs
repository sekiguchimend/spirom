//! 入力サニタイズユーティリティ
//! XSS対策、入力検証のための共通関数

/// HTMLエンティティをエスケープしてXSS攻撃を防止
///
/// # Arguments
/// * `input` - サニタイズする入力文字列
///
/// # Returns
/// エスケープされた安全な文字列
///
/// # Example
/// ```
/// let unsafe_input = "<script>alert('xss')</script>";
/// let safe = sanitize_html(unsafe_input);
/// assert_eq!(safe, "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
/// ```
pub fn sanitize_html(input: &str) -> String {
    input
        .replace('&', "&amp;")  // &は最初にエスケープ（他のエンティティに影響しないように）
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}

/// 入力文字列をサニタイズ（長さ制限付き）
///
/// # Arguments
/// * `input` - サニタイズする入力文字列
/// * `max_length` - 最大文字数
///
/// # Returns
/// エスケープされ、トリミングされた安全な文字列
pub fn sanitize_input(input: &str, max_length: usize) -> String {
    let truncated: String = input.chars().take(max_length).collect();
    sanitize_html(&truncated).trim().to_string()
}

/// デフォルトの最大長（5000文字）でサニタイズ
pub fn sanitize_input_default(input: &str) -> String {
    sanitize_input(input, 5000)
}

/// ユーザー名をサニタイズ（短い長さ制限）
pub fn sanitize_username(input: &str) -> String {
    sanitize_input(input, 100)
}

/// メールアドレスを正規化
/// - 小文字に変換
/// - 前後の空白を削除
/// - XSSエスケープは行わない（メールアドレスとして使用するため）
pub fn normalize_email(email: &str) -> String {
    email.to_lowercase().trim().to_string()
}

/// 数値文字列を検証（SQLインジェクション対策）
pub fn is_safe_numeric(input: &str) -> bool {
    input.chars().all(|c| c.is_ascii_digit() || c == '-' || c == '.')
}

/// UUIDを検証
pub fn is_valid_uuid(input: &str) -> bool {
    uuid::Uuid::parse_str(input).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_html() {
        assert_eq!(sanitize_html("<script>"), "&lt;script&gt;");
        assert_eq!(sanitize_html("\"test\""), "&quot;test&quot;");
        assert_eq!(sanitize_html("'test'"), "&#x27;test&#x27;");
        assert_eq!(sanitize_html("a & b"), "a &amp; b");
    }

    #[test]
    fn test_sanitize_input() {
        let long_input = "a".repeat(10000);
        let result = sanitize_input(&long_input, 100);
        assert_eq!(result.len(), 100);
    }

    #[test]
    fn test_normalize_email() {
        assert_eq!(normalize_email("  TEST@Example.com  "), "test@example.com");
    }

    #[test]
    fn test_is_safe_numeric() {
        assert!(is_safe_numeric("123"));
        assert!(is_safe_numeric("-123.45"));
        assert!(!is_safe_numeric("123; DROP TABLE users"));
    }

    #[test]
    fn test_is_valid_uuid() {
        assert!(is_valid_uuid("550e8400-e29b-41d4-a716-446655440000"));
        assert!(!is_valid_uuid("not-a-uuid"));
    }
}
