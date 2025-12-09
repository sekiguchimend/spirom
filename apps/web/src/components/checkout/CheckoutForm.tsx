'use client';

import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { createOrder, createPaymentIntent, type OrderItem } from '@/lib/api';
import { PaymentForm } from './PaymentForm';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CheckoutFormProps {
  cartItems: CartItem[];
  shippingAddressId: string;
  token: string;
}

type CheckoutStep = 'creating_order' | 'creating_payment' | 'ready' | 'error';

export function CheckoutForm({
  cartItems,
  shippingAddressId,
  token,
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
        const orderItems: OrderItem[] = cartItems.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price,
        }));

        const orderResponse = await createOrder(
          {
            items: orderItems,
            shipping_address_id: shippingAddressId,
            payment_method: 'credit_card',
          },
          token
        );

        const order = orderResponse.data;
        setOrderId(order.id);
        setOrderNumber(order.order_number);
        setTotal(order.total);

        // 2. PaymentIntent作成
        setStep('creating_payment');
        const paymentResponse = await createPaymentIntent(order.id, token);
        setClientSecret(paymentResponse.data.client_secret);

        setStep('ready');
      } catch (err) {
        console.error('Checkout initialization failed:', err);
        setError(err instanceof Error ? err.message : '決済の準備中にエラーが発生しました');
        setStep('error');
      }
    };

    initializeCheckout();
  }, [cartItems, shippingAddressId, token]);

  const handlePaymentSuccess = () => {
    // Stripe will redirect to return_url
  };

  const handlePaymentError = (message: string) => {
    setError(message);
  };

  // ローディング中
  if (step === 'creating_order' || step === 'creating_payment') {
    return (
      <div className="bg-white border-3 sm:border-4 border-black rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col items-center justify-center py-8 sm:py-12">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-3 sm:border-4 border-black border-t-transparent rounded-full animate-spin mb-4 sm:mb-6" />
          <p className="font-black text-base sm:text-xl uppercase tracking-wider text-center">
            {step === 'creating_order' ? '注文を作成中...' : '決済を準備中...'}
          </p>
        </div>
      </div>
    );
  }

  // エラー
  if (step === 'error') {
    return (
      <div className="bg-white border-3 sm:border-4 border-black rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col items-center justify-center py-8 sm:py-12">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 border-3 sm:border-4 border-red-500 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6 sm:w-8 sm:h-8 text-red-500"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </div>
          <p className="font-black text-base sm:text-xl uppercase tracking-wider text-red-500 mb-3 sm:mb-4 text-center">
            エラーが発生しました
          </p>
          <p className="text-gray-600 text-center text-sm sm:text-base mb-4 sm:mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-black uppercase tracking-wider bg-black text-white border-2 sm:border-3 border-black rounded-lg sm:rounded-xl shadow-[3px_3px_0px_0px_rgba(125,255,58,1)] sm:shadow-[4px_4px_0px_0px_rgba(125,255,58,1)] hover:shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] sm:hover:shadow-[6px_6px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
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
    <div className="bg-white border-3 sm:border-4 border-black rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight mb-4 sm:mb-6">
        お支払い情報
      </h2>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#000000',
              colorBackground: '#ffffff',
              colorText: '#000000',
              colorDanger: '#ef4444',
              fontFamily: 'system-ui, sans-serif',
              borderRadius: '8px',
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
    </div>
  );
}
