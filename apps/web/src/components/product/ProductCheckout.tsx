'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { createOrder, createPaymentIntent, type OrderItem } from '@/lib/api';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface ProductCheckoutProps {
  product: Product;
  quantity: number;
  onClose: () => void;
}

// 開発用アドレスとトークン
const mockAddress = {
  id: '00000000-0000-0000-0000-000000000002',
  name: '開発ユーザー',
  postal_code: '150-0001',
  prefecture: '東京都',
  city: '渋谷区',
  address_line1: '神宮前1-2-3',
  phone: '03-1234-5678',
};
const mockToken = 'dev-token';

function formatPrice(price: number): string {
  return `¥${price.toLocaleString()}`;
}

function PaymentFormInner({
  orderId,
  orderNumber,
  total,
}: {
  orderId: string;
  orderNumber: string;
  total: number;
}) {
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
      setErrorMessage(error.message || '決済処理中にエラーが発生しました');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-[#4a7c59]/5 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-gray-600 text-xs">注文番号</span>
          <span className="font-bold text-[#323232] text-xs">{orderNumber}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">お支払い金額</span>
          <span className="text-xl font-black text-[#4a7c59]">{formatPrice(total)}</span>
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
        className="w-full px-6 py-3 text-base font-bold bg-[#4a7c59] text-white rounded-xl hover:bg-[#3d6a4a] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

export default function ProductCheckout({
  product,
  quantity,
  onClose,
}: ProductCheckoutProps) {
  const [step, setStep] = useState<'loading' | 'ready' | 'error'>('loading');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subtotal = product.price * quantity;
  const shipping = subtotal >= 5000 ? 0 : 550;
  const total = subtotal + shipping;

  const initializeCheckout = async () => {
    try {
      setStep('loading');

      // PaymentIntent作成（注文はまだ作成しない）
      const items: OrderItem[] = [
        {
          product_id: product.id,
          quantity: quantity,
          price: product.price,
        },
      ];

      const paymentResponse = await createPaymentIntent(
        {
          items,
          shipping_address_id: mockAddress.id,
          notes: undefined,
        },
        mockToken
      );

      setClientSecret(paymentResponse.data.client_secret);
      setOrderId(paymentResponse.data.payment_intent_id); // 仮のID
      setOrderNumber('決済後に発行');

      setStep('ready');
    } catch (err) {
      console.error('Checkout initialization failed:', err);
      setError(err instanceof Error ? err.message : '決済の準備中にエラーが発生しました');
      setStep('error');
    }
  };

  // モーダルを開いたら自動的に決済準備を開始
  React.useEffect(() => {
    initializeCheckout();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-[#FAFAFA] rounded-2xl shadow-2xl w-full max-w-3xl mx-4 relative">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
          aria-label="閉じる"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#000000"
            strokeWidth="4"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 md:p-8">
          {/* ヘッダー */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-[#4a7c59]" />
              <p className="text-xs tracking-[0.2em] text-[#4a7c59] uppercase font-bold">
                Checkout
              </p>
            </div>
            <h2 className="text-xl text-[#323232]" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>お支払い</h2>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {/* 左: 商品情報（見積書風） */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl p-5 shadow-sm sticky top-8">
                <h3 className="text-base font-black text-[#323232] mb-5">注文内容</h3>

                {/* 商品サムネイル */}
                <div className="flex gap-3 mb-5 pb-5 border-b-2 border-gray-100">
                  <div className="w-16 h-16 relative bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-contain p-2"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#323232] text-xs mb-1 line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-600 mb-1.5">数量: {quantity}</p>
                    <p className="font-bold text-[#4a7c59] text-sm">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </div>

                {/* 金額内訳 */}
                <dl className="space-y-2.5 mb-5">
                  <div className="flex justify-between text-xs text-gray-600">
                    <dt>小計</dt>
                    <dd className="font-bold text-[#323232]">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <dt>送料</dt>
                    <dd className="font-bold text-[#323232]">
                      {shipping === 0 ? (
                        <span className="text-[#4a7c59] bg-[#4a7c59]/10 px-2 py-0.5 rounded-full text-xs font-bold">
                          無料
                        </span>
                      ) : (
                        formatPrice(shipping)
                      )}
                    </dd>
                  </div>
                  <div className="pt-2.5 border-t-2 border-gray-100 flex justify-between items-baseline">
                    <dt className="font-bold text-[#323232] text-sm">合計</dt>
                    <dd className="text-xl font-black text-[#4a7c59]">{formatPrice(total)}</dd>
                  </div>
                  <p className="text-xs text-gray-500 text-right">（税込）</p>
                </dl>

                {/* 配送先 */}
                <div className="bg-[#4a7c59]/5 rounded-lg p-3">
                  <p className="text-xs font-bold text-[#4a7c59] mb-1.5 uppercase tracking-wider">
                    配送先
                  </p>
                  <p className="text-xs font-bold text-[#323232] mb-1">{mockAddress.name}</p>
                  <p className="text-xs text-gray-600">〒{mockAddress.postal_code}</p>
                  <p className="text-xs text-gray-600">
                    {mockAddress.prefecture}
                    {mockAddress.city}
                    {mockAddress.address_line1}
                  </p>
                </div>
              </div>
            </div>

            {/* 右: 決済フォーム */}
            <div className="md:col-span-3">
              {step === 'loading' && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="w-12 h-12 border-4 border-[#4a7c59] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="font-bold text-base text-[#323232]">準備中...</p>
                  </div>
                </div>
              )}

              {step === 'error' && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </div>
                    <p className="font-bold text-lg text-red-500 mb-3">エラーが発生しました</p>
                    <p className="text-gray-600 text-center text-sm mb-5">{error}</p>
                    <button
                      onClick={initializeCheckout}
                      className="px-5 py-2.5 font-bold bg-[#4a7c59] text-white rounded-xl hover:bg-[#3d6a4a] transition-all text-sm"
                    >
                      再試行
                    </button>
                  </div>
                </div>
              )}

              {step === 'ready' && clientSecret && orderId && orderNumber && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <Elements
                    stripe={getStripe()}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#4a7c59',
                          colorBackground: '#f2f6f3',
                          colorText: '#323232',
                          colorDanger: '#ef4444',
                          fontFamily: 'system-ui, sans-serif',
                          borderRadius: '12px',
                        },
                      },
                      locale: 'ja',
                    }}
                  >
                    <PaymentFormInner
                      orderId={orderId}
                      orderNumber={orderNumber}
                      total={total}
                    />
                  </Elements>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

