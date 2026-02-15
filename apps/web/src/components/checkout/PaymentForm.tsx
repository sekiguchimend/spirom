'use client';

import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { formatPrice } from '@/lib/utils';

interface PaymentFormProps {
  orderId: string;
  orderNumber: string;
  total: number;
  isGuest?: boolean;
  guestToken?: string;
}

export function PaymentForm({
  orderId,
  orderNumber,
  total,
  isGuest = false,
  guestToken,
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

    // ゲスト注文の場合はトークンをURLに含める
    let returnUrl = `${window.location.origin}/checkout/complete?order_id=${orderId}`;
    if (isGuest && guestToken) {
      returnUrl += `&guest=true&token=${encodeURIComponent(guestToken)}`;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    if (error) {
      setErrorMessage(error.message || '決済処理中にエラーが発生しました');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-primary/5 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-gray-600 text-xs">注文番号</span>
          <span className="font-bold text-text-dark text-xs">{orderNumber}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">お支払い金額</span>
          <span className="text-xl font-black text-primary">{formatPrice(total)}</span>
        </div>
      </div>

      <div>
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-700 text-xs">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full px-6 py-3 text-base font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? '処理中...' : `${formatPrice(total)} を支払う`}
      </button>

      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-3.5 h-3.5"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>SSL暗号化通信で安全にお支払い</span>
      </div>
    </form>
  );
}


