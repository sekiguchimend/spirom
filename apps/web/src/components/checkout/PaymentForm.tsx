'use client';

import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

interface PaymentFormProps {
  orderId: string;
  orderNumber: string;
  total: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function PaymentForm({
  orderId,
  orderNumber,
  total,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/complete?order_id=${orderId}`,
      },
    });

    if (error) {
      // カード番号エラーなどの場合はここに来る
      // redirect_to_urlの場合は来ない
      setErrorMessage(error.message || '決済処理中にエラーが発生しました');
      onError(error.message || '決済処理中にエラーが発生しました');
      setIsProcessing(false);
    } else {
      // 通常はreturn_urlにリダイレクトされるのでここには来ない
      onSuccess();
    }
  };

  const formatPrice = (price: number): string => {
    return `¥${price.toLocaleString()}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* 注文情報 */}
      <div className="bg-gray-50 border-2 sm:border-3 border-black rounded-lg sm:rounded-xl p-3 sm:p-4">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-600 text-sm sm:text-base">注文番号</span>
          <span className="font-black text-sm sm:text-base">{orderNumber}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="font-bold text-gray-600 text-sm sm:text-base">お支払い金額</span>
          <span className="text-xl sm:text-2xl font-black">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="bg-white border-2 sm:border-3 border-black rounded-lg sm:rounded-xl p-3 sm:p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* エラーメッセージ */}
      {errorMessage && (
        <div className="bg-red-50 border-2 sm:border-3 border-red-500 rounded-lg sm:rounded-xl p-3 sm:p-4 text-red-700 font-bold text-sm sm:text-base">
          {errorMessage}
        </div>
      )}

      {/* 支払いボタン */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full px-5 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-black uppercase tracking-wider bg-black text-white border-3 sm:border-4 border-black rounded-lg sm:rounded-xl shadow-[4px_4px_0px_0px_rgba(125,255,58,1)] sm:shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[6px_6px_0px_0px_rgba(125,255,58,1)] sm:hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0px_0px_rgba(125,255,58,1)] sm:disabled:hover:shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            処理中...
          </span>
        ) : (
          `${formatPrice(total)} を支払う`
        )}
      </button>

      {/* セキュリティ表示 */}
      <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>SSL暗号化通信で安全にお支払い</span>
      </div>
    </form>
  );
}
