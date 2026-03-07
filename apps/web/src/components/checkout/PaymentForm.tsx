'use client';

import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { formatPrice } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface PaymentFormProps {
  orderId?: string;
  orderNumber?: string;
  total: number;
  isGuest?: boolean;
  guestToken?: string;
  locale?: string;
}

export function PaymentForm({
  orderId,
  orderNumber,
  total,
  isGuest = false,
  guestToken,
  locale = 'ja',
}: PaymentFormProps) {
  const { t } = useTranslation('common');
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // 言語プレフィックス付きのreturn URL
    // ゲスト注文の場合はorder_idとtokenを含める、認証済みの場合はStripeがpayment_intentを追加
    let returnUrl = `${window.location.origin}/${locale}/checkout/complete`;
    if (isGuest && guestToken && orderId) {
      returnUrl += `?order_id=${orderId}&guest=true&token=${encodeURIComponent(guestToken)}`;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    if (error) {
      setErrorMessage(error.message || t('checkout.paymentError'));
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-primary/5 rounded-lg p-4">
        {orderNumber && (
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-gray-600 text-xs">{t('checkout.orderNumber')}</span>
            <span className="font-bold text-text-dark text-xs">{orderNumber}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">{t('checkout.paymentAmount')}</span>
          <span className="text-xl font-black text-primary">{formatPrice(total)}</span>
        </div>
      </div>

      <div>
        <PaymentElement onReady={() => setIsPaymentElementReady(true)} />
      </div>

      {errorMessage && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-700 text-xs">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !isPaymentElementReady || isProcessing}
        className="w-full px-6 py-3 text-base font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? t('checkout.processing') : !isPaymentElementReady ? '読み込み中...' : `${formatPrice(total)} ${t('checkout.payButton')}`}
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
        <span>{t('checkout.securePayment')}</span>
      </div>
    </form>
  );
}


