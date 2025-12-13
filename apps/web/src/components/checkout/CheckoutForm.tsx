'use client';

import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { createOrderAction, createPaymentIntentAction, type CreateOrderItemRequest } from '@/lib/actions';
import { PaymentForm } from './PaymentForm';
import { LoadingSpinner } from '@/components/ui';
import { ORDER_MESSAGES, PAYMENT_MESSAGES } from '@/lib/messages';

/** チェックアウト用のカートアイテム型（表示用の最小限のフィールド） */
interface CheckoutCartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CheckoutFormProps {
  cartItems: CheckoutCartItem[];
  shippingAddressId: string;
}

type CheckoutStep = 'creating_order' | 'creating_payment' | 'ready' | 'error';

export function CheckoutForm({
  cartItems,
  shippingAddressId,
}: CheckoutFormProps) {
  const [step, setStep] = useState<CheckoutStep>('creating_order');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeCheckout = async () => {
      try {
        // 1. 注文作成
        setStep('creating_order');
        const orderItems: CreateOrderItemRequest[] = cartItems.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price,
        }));

        const orderResult = await createOrderAction({
          items: orderItems,
          shipping_address_id: shippingAddressId,
          payment_method: 'credit_card',
        });

        if (!orderResult.success || !orderResult.data) {
          throw new Error(orderResult.error || ORDER_MESSAGES.CREATE_FAILED);
        }

        const order = orderResult.data;
        setOrderId(order.id);
        setOrderNumber(order.order_number);
        setTotal(order.total);

        // 2. PaymentIntent作成
        setStep('creating_payment');
        const paymentResult = await createPaymentIntentAction(orderItems, shippingAddressId);

        if (!paymentResult.success || !paymentResult.data) {
          throw new Error(paymentResult.error || PAYMENT_MESSAGES.INTENT_FAILED);
        }

        setClientSecret(paymentResult.data.client_secret);

        setStep('ready');
      } catch (err) {
        console.error('Checkout initialization failed:', err);
        setError(err instanceof Error ? err.message : PAYMENT_MESSAGES.FAILED);
        setStep('error');
      }
    };

    initializeCheckout();
  }, [cartItems, shippingAddressId]);

  const handlePaymentSuccess = () => {
    // Stripe will redirect to return_url
  };

  const handlePaymentError = (message: string) => {
    setError(message);
  };

  // ローディング中
  if (step === 'creating_order' || step === 'creating_payment') {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-6">
            <LoadingSpinner size="lg" />
          </div>
          <p className="font-bold text-lg text-text-dark text-center">
            {step === 'creating_order' ? '注文を作成中...' : '決済を準備中...'}
          </p>
        </div>
      </div>
    );
  }

  // エラー
  if (step === 'error') {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-red-500"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </div>
          <p className="font-bold text-xl text-red-500 mb-4 text-center">
            エラーが発生しました
          </p>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 font-bold bg-[#4a7c59] text-white rounded-xl hover:bg-[#3d6a4a] transition-all shadow-md hover:shadow-lg"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  // 決済フォーム表示
  if (!clientSecret || !orderId || !orderNumber) {
    return null;
  }

  const stripePromise = getStripe();

  return (
    <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#4a7c59]/10 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a7c59" strokeWidth="2">
            <rect width="20" height="14" x="2" y="5" rx="2"/>
            <path d="M2 10h20"/>
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-[#323232]">
          お支払い情報
        </h2>
      </div>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#4a7c59',
              colorBackground: '#ffffff',
              colorText: '#323232',
              colorDanger: '#ef4444',
              fontFamily: 'system-ui, sans-serif',
              borderRadius: '12px',
              spacingUnit: '4px',
            },
          },
          locale: 'ja',
        }}
      >
        <PaymentForm
          orderId={orderId}
          orderNumber={orderNumber}
          total={total}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      </Elements>
    </section>
  );
}
