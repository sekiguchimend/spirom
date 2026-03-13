use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::env;
use tracing::{info, warn};

/// デフォルト値（本番環境）
const DEFAULT_CHAIN_ID: i32 = 137; // Polygon Mainnet
const DEFAULT_CONTRACT_ADDRESS: &str = "0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB"; // JPYC V2
const DEFAULT_REQUIRED_CONFIRMATIONS: u64 = 12;

/// テスト環境用デフォルト値
const TESTNET_CHAIN_ID: i32 = 80002; // Polygon Amoy Testnet
const TESTNET_REQUIRED_CONFIRMATIONS: u64 = 2; // テストでは少なめ

/// ERC20 Transfer イベントトピック (keccak256("Transfer(address,address,uint256)"))
const TRANSFER_EVENT_TOPIC: &str = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/// 環境変数からJPYC設定を取得
pub fn get_jpyc_config() -> JpycConfig {
    let is_test_mode = env::var("JPYC_TEST_MODE")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false);

    if is_test_mode {
        JpycConfig {
            chain_id: env::var("JPYC_CHAIN_ID")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(TESTNET_CHAIN_ID),
            contract_address: env::var("JPYC_CONTRACT_ADDRESS")
                .unwrap_or_else(|_| DEFAULT_CONTRACT_ADDRESS.to_string()),
            required_confirmations: env::var("JPYC_REQUIRED_CONFIRMATIONS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(TESTNET_REQUIRED_CONFIRMATIONS),
            rpc_url: env::var("POLYGON_RPC_URL")
                .unwrap_or_else(|_| "https://rpc-amoy.polygon.technology".to_string()),
            is_test_mode: true,
        }
    } else {
        JpycConfig {
            chain_id: env::var("JPYC_CHAIN_ID")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(DEFAULT_CHAIN_ID),
            contract_address: env::var("JPYC_CONTRACT_ADDRESS")
                .unwrap_or_else(|_| DEFAULT_CONTRACT_ADDRESS.to_string()),
            required_confirmations: env::var("JPYC_REQUIRED_CONFIRMATIONS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(DEFAULT_REQUIRED_CONFIRMATIONS),
            rpc_url: env::var("POLYGON_RPC_URL")
                .unwrap_or_else(|_| "https://polygon-rpc.com".to_string()),
            is_test_mode: false,
        }
    }
}

/// JPYC設定
#[derive(Debug, Clone)]
pub struct JpycConfig {
    pub chain_id: i32,
    pub contract_address: String,
    pub required_confirmations: u64,
    pub rpc_url: String,
    pub is_test_mode: bool,
}

/// JPYC検証サービス
#[derive(Clone)]
pub struct JpycVerifier {
    config: JpycConfig,
    recipient_address: String,
    http_client: reqwest::Client,
}

/// 検証済みトランザクション情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifiedTransaction {
    pub tx_hash: String,
    pub chain_id: i32,
    pub sender_address: String,
    pub recipient_address: String,
    pub amount_wei: String,
    pub amount_jpyc: i64,
    pub block_number: u64,
    pub block_hash: String,
    pub confirmations: u64,
}

/// JSON-RPC リクエスト
#[derive(Serialize)]
struct JsonRpcRequest {
    jsonrpc: &'static str,
    method: &'static str,
    params: serde_json::Value,
    id: u32,
}

/// JSON-RPC レスポンス
#[derive(Deserialize)]
struct JsonRpcResponse<T> {
    result: Option<T>,
    error: Option<JsonRpcError>,
}

#[derive(Deserialize, Debug)]
struct JsonRpcError {
    code: i32,
    message: String,
}

/// トランザクションレシート
#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct TransactionReceipt {
    status: String,
    block_number: String,
    block_hash: String,
    logs: Vec<TransactionLog>,
}

/// トランザクションログ
#[derive(Deserialize, Debug)]
struct TransactionLog {
    address: String,
    topics: Vec<String>,
    data: String,
}

impl JpycVerifier {
    pub fn new(recipient_address: String) -> Self {
        let config = get_jpyc_config();
        let http_client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        if config.is_test_mode {
            warn!(
                chain_id = config.chain_id,
                contract = %config.contract_address,
                "JPYC running in TEST MODE"
            );
        }

        Self {
            config,
            recipient_address: recipient_address.to_lowercase(),
            http_client,
        }
    }

    /// 設定を取得
    pub fn get_config(&self) -> &JpycConfig {
        &self.config
    }

    /// トランザクションを検証
    ///
    /// セキュリティチェック:
    /// 1. トランザクションが成功しているか
    /// 2. JPYCコントラクトへのTransferイベントか
    /// 3. 受取人が正しいか
    /// 4. 金額が期待値と一致するか
    /// 5. 十分な確認数があるか
    pub async fn verify_transaction(
        &self,
        tx_hash: &str,
        expected_amount_jpyc: i64,
    ) -> Result<VerifiedTransaction> {
        // tx_hashフォーマット検証
        if !tx_hash.starts_with("0x") || tx_hash.len() != 66 {
            return Err(anyhow!("Invalid transaction hash format"));
        }

        // 1. トランザクションレシートを取得
        let receipt = self.get_transaction_receipt(tx_hash).await?;

        // 2. トランザクションが成功しているか確認
        if receipt.status != "0x1" {
            return Err(anyhow!("Transaction failed on chain"));
        }

        // 3. JPYCのTransferイベントを探す
        let transfer_log = self.find_jpyc_transfer_log(&receipt.logs)?;

        // 4. 送金先アドレスを検証
        let recipient = self.decode_address_from_topic(&transfer_log.topics[2])?;
        if recipient.to_lowercase() != self.recipient_address {
            return Err(anyhow!(
                "Recipient mismatch: expected {}, got {}",
                self.recipient_address,
                recipient
            ));
        }

        // 5. 送金元アドレスを取得
        let sender = self.decode_address_from_topic(&transfer_log.topics[1])?;

        // 6. 送金額を検証（JPYCは18デシマル）
        let amount_wei = self.decode_uint256(&transfer_log.data)?;
        let amount_jpyc = self.wei_to_jpyc(&amount_wei)?;

        if amount_jpyc < expected_amount_jpyc {
            return Err(anyhow!(
                "Amount mismatch: expected {} JPYC, got {} JPYC",
                expected_amount_jpyc,
                amount_jpyc
            ));
        }

        // 7. 現在のブロック番号を取得して確認数を計算
        let current_block = self.get_block_number().await?;
        let tx_block = u64::from_str_radix(&receipt.block_number[2..], 16)
            .map_err(|e| anyhow!("Failed to parse block number: {}", e))?;
        let confirmations = current_block.saturating_sub(tx_block);

        if confirmations < self.config.required_confirmations {
            return Err(anyhow!(
                "Insufficient confirmations: {} (required: {})",
                confirmations,
                self.config.required_confirmations
            ));
        }

        info!(
            tx_hash = %tx_hash,
            sender = %sender,
            amount_jpyc = %amount_jpyc,
            confirmations = %confirmations,
            test_mode = %self.config.is_test_mode,
            "JPYC transaction verified"
        );

        Ok(VerifiedTransaction {
            tx_hash: tx_hash.to_string(),
            chain_id: self.config.chain_id,
            sender_address: sender,
            recipient_address: recipient,
            amount_wei,
            amount_jpyc,
            block_number: tx_block,
            block_hash: receipt.block_hash,
            confirmations,
        })
    }

    /// トランザクションレシートを取得
    async fn get_transaction_receipt(&self, tx_hash: &str) -> Result<TransactionReceipt> {
        let request = JsonRpcRequest {
            jsonrpc: "2.0",
            method: "eth_getTransactionReceipt",
            params: serde_json::json!([tx_hash]),
            id: 1,
        };

        let response: JsonRpcResponse<TransactionReceipt> = self
            .http_client
            .post(&self.config.rpc_url)
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        if let Some(error) = response.error {
            return Err(anyhow!("RPC error: {} (code: {})", error.message, error.code));
        }

        response
            .result
            .ok_or_else(|| anyhow!("Transaction not found or not yet mined"))
    }

    /// 現在のブロック番号を取得
    async fn get_block_number(&self) -> Result<u64> {
        let request = JsonRpcRequest {
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: serde_json::json!([]),
            id: 1,
        };

        let response: JsonRpcResponse<String> = self
            .http_client
            .post(&self.config.rpc_url)
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        if let Some(error) = response.error {
            return Err(anyhow!("RPC error: {} (code: {})", error.message, error.code));
        }

        let block_hex = response
            .result
            .ok_or_else(|| anyhow!("Failed to get block number"))?;

        u64::from_str_radix(&block_hex[2..], 16)
            .map_err(|e| anyhow!("Failed to parse block number: {}", e))
    }

    /// JPYCのTransferイベントログを探す
    fn find_jpyc_transfer_log<'a>(&self, logs: &'a [TransactionLog]) -> Result<&'a TransactionLog> {
        for log in logs {
            // JPYCコントラクトアドレスか確認
            if log.address.to_lowercase() != self.config.contract_address.to_lowercase() {
                continue;
            }

            // Transferイベントか確認
            if log.topics.is_empty() {
                continue;
            }

            if log.topics[0].to_lowercase() == TRANSFER_EVENT_TOPIC.to_lowercase() {
                // Transfer(from, to, amount) - 3つのトピックが必要
                if log.topics.len() >= 3 {
                    return Ok(log);
                }
            }
        }

        Err(anyhow!("No JPYC transfer event found in transaction"))
    }

    /// トピックからアドレスをデコード
    fn decode_address_from_topic(&self, topic: &str) -> Result<String> {
        // トピックは32バイト（64文字 + 0x）、アドレスは20バイト
        // 下位20バイトを取り出す
        if topic.len() != 66 {
            return Err(anyhow!("Invalid topic length"));
        }

        // 0x + 24文字のパディング + 40文字のアドレス
        let address = format!("0x{}", &topic[26..]);
        Ok(address.to_lowercase())
    }

    /// データからuint256をデコード
    fn decode_uint256(&self, data: &str) -> Result<String> {
        // 0xを除去
        let hex_data = data.strip_prefix("0x").unwrap_or(data);

        // 先頭のゼロを除去した16進数文字列を返す
        let trimmed = hex_data.trim_start_matches('0');
        if trimmed.is_empty() {
            return Ok("0".to_string());
        }

        Ok(format!("0x{}", trimmed))
    }

    /// Wei（18デシマル）からJPYC（整数）に変換
    fn wei_to_jpyc(&self, amount_wei: &str) -> Result<i64> {
        let hex_str = amount_wei.strip_prefix("0x").unwrap_or(amount_wei);

        // 大きな数値を扱うため、文字列で処理
        // JPYCは18デシマルなので、下18桁を切り捨てる
        let wei = u128::from_str_radix(hex_str, 16)
            .map_err(|e| anyhow!("Failed to parse wei amount: {}", e))?;

        // 10^18で割る
        let jpyc = wei / 1_000_000_000_000_000_000u128;

        Ok(jpyc as i64)
    }

    /// 受取人アドレスを取得（フロントエンドに渡す用）
    pub fn get_recipient_address(&self) -> &str {
        &self.recipient_address
    }

    /// 必要な確認数を取得
    pub fn get_required_confirmations(&self) -> u64 {
        self.config.required_confirmations
    }

    /// コントラクトアドレスを取得
    pub fn get_contract_address(&self) -> &str {
        &self.config.contract_address
    }

    /// チェーンIDを取得
    pub fn get_chain_id(&self) -> i32 {
        self.config.chain_id
    }

    /// テストモードかどうか
    pub fn is_test_mode(&self) -> bool {
        self.config.is_test_mode
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_address_from_topic() {
        let verifier = JpycVerifier::new(
            "0x1234567890123456789012345678901234567890".to_string(),
        );

        let topic = "0x000000000000000000000000abcdef1234567890abcdef1234567890abcdef12";
        let address = verifier.decode_address_from_topic(topic).unwrap();
        assert_eq!(address, "0xabcdef1234567890abcdef1234567890abcdef12");
    }

    #[test]
    fn test_wei_to_jpyc() {
        let verifier = JpycVerifier::new(
            "0x1234567890123456789012345678901234567890".to_string(),
        );

        // 1000 JPYC = 1000 * 10^18 wei
        // 0xDE0B6B3A7640000 = 10^18 (1 JPYC)
        let one_jpyc = "0xDE0B6B3A7640000";
        assert_eq!(verifier.wei_to_jpyc(one_jpyc).unwrap(), 1);

        // 1000 JPYC = 0x3635C9ADC5DEA00000
        let thousand_jpyc = "0x3635C9ADC5DEA00000";
        assert_eq!(verifier.wei_to_jpyc(thousand_jpyc).unwrap(), 1000);
    }

    #[test]
    fn test_config_defaults() {
        // 環境変数がない場合はデフォルト値が使われる
        let config = get_jpyc_config();
        assert_eq!(config.chain_id, DEFAULT_CHAIN_ID);
        assert_eq!(config.contract_address, DEFAULT_CONTRACT_ADDRESS);
    }
}
