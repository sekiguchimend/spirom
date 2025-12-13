'use client';

import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { formatPrice } from '@/lib/utils';
import { getCheckoutCompleteUrl } from '@/lib/routes';
import { PAYMENT_MESSAGES } from '@/lib/messages';
import { LoadingSpinner } from '@/components/ui';

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
        return_url: getCheckoutCompleteUrl(orderId),
      },
    });

    if (error) {
      // カード番号エラーなどの場合はここに来る
      // redirect_to_urlの場合は来ない
      setErrorMessage(error.message || PAYMENT_MESSAGES.FAILED);
      onError(error.message || PAYMENT_MESSAGES.FAILED);
      setIsProcessing(false);
    } else {
      // 通常はreturn_urlにリダイレクトされるのでここには来ない
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 注文情報 */}
      <div className="bg-primary/5 rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-600">注文番号</span>
          <span className="font-bold text-text-dark">{orderNumber}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">お支払い金額</span>
          <span className="text-2xl font-black text-primary">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div>
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* エラーメッセージ */}
      {errorMessage && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700 font-medium">
          {errorMessage}
        </div>
      )}

      {/* 支払いボタン */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full px-8 py-4 text-lg font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md disabled:hover:bg-primary"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" color="white" />
            {PAYMENT_MESSAGES.PROCESSING}
          </span>
        ) : (
          `${formatPrice(total)} を支払う`
        )}
      </button>

      {/* セキュリティ表示 */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
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
