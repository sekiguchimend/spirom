'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits, encodeFunctionData } from 'viem';
import { polygon, polygonAmoy } from 'wagmi/chains';
import { Loader2 } from 'lucide-react';

// JPYC ERC20 ABI (transferのみ)
const JPYC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

interface JpycPaymentFormProps {
  orderId: string;
  amountJpyc: number;
  recipientAddress: string;
  contractAddress: string;
  chainId: number;
  requiredConfirmations: number;
  onSuccess: (txHash: string) => void;
  onError: (error: string) => void;
}

type PaymentStep = 'connect' | 'ready' | 'sending' | 'confirming' | 'verifying' | 'success' | 'error';

export function JpycPaymentForm({
  orderId,
  amountJpyc,
  recipientAddress,
  contractAddress,
  chainId,
  requiredConfirmations,
  onSuccess,
  onError,
}: JpycPaymentFormProps) {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [step, setStep] = useState<PaymentStep>('connect');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    confirmations: requiredConfirmations,
  });

  // ウォレット接続状態の監視
  useEffect(() => {
    if (isConnected && chain?.id === chainId) {
      setStep('ready');
    } else if (isConnected && chain?.id !== chainId) {
      setStep('connect'); // チェーン切り替えが必要
    } else {
      setStep('connect');
    }
  }, [isConnected, chain, chainId]);

  // トランザクション送信処理
  const handleSendTransaction = useCallback(async () => {
    if (!address) return;

    setStep('sending');
    setErrorMessage('');

    try {
      // JPYCは18デシマル
      const amountWei = parseUnits(amountJpyc.toString(), 18);

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: JPYC_ABI,
        functionName: 'transfer',
        args: [recipientAddress as `0x${string}`, amountWei],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setErrorMessage(message);
      setStep('error');
      onError(message);
    }
  }, [address, amountJpyc, contractAddress, recipientAddress, writeContract, onError]);

  // トランザクションハッシュの監視
  useEffect(() => {
    if (hash) {
      setTxHash(hash);
      setStep('confirming');
    }
  }, [hash]);

  // 確認完了の監視
  useEffect(() => {
    if (isConfirmed && hash) {
      setStep('verifying');
      onSuccess(hash);
    }
  }, [isConfirmed, hash, onSuccess]);

  // エラーの監視
  useEffect(() => {
    if (writeError) {
      const message = writeError.message || 'Transaction failed';
      setErrorMessage(message);
      setStep('error');
      onError(message);
    }
  }, [writeError, onError]);

  // チェーン切り替え
  const handleSwitchChain = async () => {
    try {
      await switchChain({ chainId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch chain';
      setErrorMessage(message);
    }
  };

  // ネットワーク名を取得
  const getNetworkName = () => {
    if (chainId === polygonAmoy.id) return 'Polygon Amoy (Testnet)';
    return 'Polygon';
  };

  // ブロックエクスプローラーURLを取得
  const getExplorerUrl = (hash: string) => {
    if (chainId === polygonAmoy.id) return `https://amoy.polygonscan.com/tx/${hash}`;
    return `https://polygonscan.com/tx/${hash}`;
  };

  // 金額のフォーマット
  const formattedAmount = new Intl.NumberFormat('ja-JP').format(amountJpyc);

  return (
    <div className="space-y-6">
      {/* ステップ表示 */}
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span className={step === 'connect' ? 'text-white font-medium' : ''}>
          1. ウォレット接続
        </span>
        <span className={['ready', 'sending'].includes(step) ? 'text-white font-medium' : ''}>
          2. 送金
        </span>
        <span className={step === 'confirming' ? 'text-white font-medium' : ''}>
          3. 確認待ち
        </span>
        <span className={['verifying', 'success'].includes(step) ? 'text-white font-medium' : ''}>
          4. 完了
        </span>
      </div>

      {/* 支払い情報 */}
      <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-zinc-400">支払い金額</span>
          <span className="text-white font-bold text-xl">{formattedAmount} JPYC</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">ネットワーク</span>
          <span className="text-white">{getNetworkName()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">送金先</span>
          <span className="text-white font-mono text-xs">
            {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
          </span>
        </div>
      </div>

      {/* ウォレット接続 */}
      {step === 'connect' && (
        <div className="space-y-4">
          {!isConnected ? (
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          ) : chain?.id !== chainId ? (
            <div className="text-center space-y-4">
              <p className="text-yellow-400">
                {getNetworkName()}に切り替えてください
              </p>
              <button
                onClick={handleSwitchChain}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                {getNetworkName()}に切り替え
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* 送金ボタン */}
      {step === 'ready' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">接続中のウォレット</span>
            <span className="text-white font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
          <button
            onClick={handleSendTransaction}
            disabled={isPending}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 text-white font-medium py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                ウォレットで確認中...
              </>
            ) : (
              `${formattedAmount} JPYC を送金`
            )}
          </button>
          <p className="text-xs text-zinc-500 text-center">
            MetaMaskなどのウォレットで承認してください
          </p>
        </div>
      )}

      {/* 送金中 */}
      {step === 'sending' && (
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-500" />
          <p className="text-white">トランザクションを送信中...</p>
        </div>
      )}

      {/* 確認待ち */}
      {step === 'confirming' && (
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-500" />
          <p className="text-white">ブロック確認中...</p>
          <p className="text-sm text-zinc-400">
            {requiredConfirmations}ブロックの確認を待っています
          </p>
          {txHash && (
            <a
              href={getExplorerUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              Polygonscanで確認
            </a>
          )}
        </div>
      )}

      {/* 検証中 */}
      {step === 'verifying' && (
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-green-500" />
          <p className="text-white">決済を検証中...</p>
          <p className="text-sm text-zinc-400">
            サーバーでトランザクションを確認しています
          </p>
        </div>
      )}

      {/* 成功 */}
      {step === 'success' && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white text-lg font-medium">決済が完了しました</p>
          {txHash && (
            <a
              href={getExplorerUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              トランザクションを確認
            </a>
          )}
        </div>
      )}

      {/* エラー */}
      {step === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
            <p className="text-red-400 text-sm">{errorMessage}</p>
          </div>
          <button
            onClick={() => setStep('ready')}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-3 rounded-lg transition-colors"
          >
            再試行
          </button>
        </div>
      )}
    </div>
  );
}
