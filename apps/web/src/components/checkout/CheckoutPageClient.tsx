'use client';

import { useEffect, useMemo, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import type { Address, CartItem, CreateOrderRequest } from '@/types';
import { getStripe } from '@/lib/stripe';
import { formatPrice } from '@/lib/utils';
import { createOrderAction, createPaymentIntentAction } from '@/lib/actions';
import { getCart, refreshCart } from '@/lib/cart';
import { ROUTES } from '@/lib/routes';
import { PaymentForm } from '@/components/checkout/PaymentForm';

export function CheckoutPageClient({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [step, setStep] = useState<'loading' | 'ready' | 'error' | 'empty-cart'>('loading');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const defaultAddress = useMemo(
    () => addresses.find((a) => a.is_default) || addresses[0] || null,
    [addresses]
  );

  useEffect(() => {
    void refreshCart()
      .then(() => {
        const c = getCart();
        setCart(c);
      })
      .catch(() => setCart(getCart()));
  }, []);

  const computedSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const initializeCheckout = async () => {
    if (!defaultAddress) {
      router.push(`${ROUTES.ACCOUNT.NEW_ADDRESS}?redirect=${encodeURIComponent(ROUTES.CHECKOUT.INDEX)}`);
      return;
    }

    if (cart.length === 0) {
      setStep('empty-cart');
      return;
    }

    try {
      setError(null);
      setStep('loading');

      // 注文作成：items を送らないことで、API側が「セッションのカート」を正として注文化する
      const request: CreateOrderRequest = {
        shipping_address_id: defaultAddress.id,
        payment_method: 'credit_card',
      };

      const orderResult = await createOrderAction(request);
      if (!orderResult.success || !orderResult.data) {
        setError(orderResult.error || '注文の作成に失敗しました');
        setStep('error');
        return;
      }

      const order = orderResult.data;
      setOrderId(order.id);
      setOrderNumber(order.order_number);
      setSubtotal(order.subtotal ?? computedSubtotal);
      setTotal(order.total);

      const paymentResult = await createPaymentIntentAction(order.id);
      if (!paymentResult.success || !paymentResult.data) {
        setError(paymentResult.error || '決済の準備中にエラーが発生しました');
        setStep('error');
        return;
      }

      setClientSecret(paymentResult.data.client_secret);
      setStep('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : '決済準備に失敗しました');
      setStep('error');
    }
  };

  useEffect(() => {
    if (cart.length === 0 && step === 'loading') return;
    // 初回ロード後に開始
    void initializeCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length]);

  const totalForSummary = total || (computedSubtotal + (computedSubtotal >= 5000 ? 0 : 500));

  return (
    <div className="min-h-screen bg-bg-light pb-10 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-0.5 w-8 bg-primary" />
            <p className="text-xs tracking-[0.2em] text-primary uppercase font-bold">
              Checkout
            </p>
            <div className="h-0.5 w-8 bg-primary" />
          </div>
          <h1 className="text-center text-2xl text-text-dark" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>
            お支払い
          </h1>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* 左: 注文サマリー */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
              <h2 className="text-base font-black text-text-dark mb-5">注文内容</h2>

              {cart.length === 0 ? (
                <p className="text-sm text-gray-600">カートは空です</p>
              ) : (
                <div className="space-y-3 mb-5">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-700">
                      <span className="font-medium truncate">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="font-bold">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 pt-5 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>小計</span>
                  <span className="font-bold text-text-dark">{formatPrice(subtotal || computedSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>合計</span>
                  <span className="text-xl font-black text-primary">{formatPrice(totalForSummary)}</span>
                </div>
              </div>

              {defaultAddress && (
                <div className="mt-5 bg-primary/5 rounded-xl p-4">
                  <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                    配送先
                  </p>
                  <p className="text-sm font-bold text-text-dark">{defaultAddress.name || '住所'}</p>
                  <p className="text-xs text-gray-600">〒{defaultAddress.postal_code}</p>
                  <p className="text-xs text-gray-600">
                    {defaultAddress.prefecture}{defaultAddress.city}{defaultAddress.address_line1}
                  </p>
                  {defaultAddress.address_line2 && (
                    <p className="text-xs text-gray-600">{defaultAddress.address_line2}</p>
                  )}
                </div>
              )}

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.ACCOUNT.ADDRESSES)}
                  className="w-full px-4 py-3 text-sm font-bold border-2 border-gray-200 text-text-dark rounded-xl hover:bg-gray-50 transition-colors"
                >
                  住所を変更する
                </button>
              </div>
            </div>
          </div>

          {/* 右: 決済 */}
          <div className="lg:col-span-3">
            {step === 'loading' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="font-bold text-base text-text-dark">準備中...</p>
                </div>
              </div>
            )}

            {step === 'empty-cart' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col items-center justify-center py-10">
                  <p className="font-bold text-lg text-text-dark mb-3">カートが空です</p>
                  <p className="text-gray-600 text-center text-sm mb-5">
                    商品を追加してからお支払いに進んでください。
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.PRODUCTS.INDEX)}
                    className="px-5 py-2.5 font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all text-sm"
                  >
                    商品一覧へ
                  </button>
                </div>
              </div>
            )}

            {step === 'error' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col items-center justify-center py-10">
                  <p className="font-bold text-lg text-red-500 mb-3">エラーが発生しました</p>
                  <p className="text-gray-600 text-center text-sm mb-5">{error}</p>
                  <button
                    type="button"
                    onClick={() => void initializeCheckout()}
                    className="px-5 py-2.5 font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all text-sm"
                  >
                    再試行
                  </button>
                </div>
              </div>
            )}

            {step === 'ready' && clientSecret && orderId && orderNumber && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
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
                  <PaymentForm orderId={orderId} orderNumber={orderNumber} total={totalForSummary} />
                </Elements>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


