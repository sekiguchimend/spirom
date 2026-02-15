'use client';

import { useEffect, useMemo, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Address, CartItem, CreateOrderRequest, GuestShippingAddress, CreateGuestOrderRequest } from '@/types';
import { getStripe } from '@/lib/stripe';
import { formatPrice } from '@/lib/utils';
import { createOrderAction, createPaymentIntentAction, createGuestOrderAction, createGuestPaymentIntentAction } from '@/lib/actions';
import { getCart, refreshCart } from '@/lib/cart';
import { ROUTES } from '@/lib/routes';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { GuestAddressForm } from '@/components/checkout/GuestAddressForm';

interface CheckoutPageClientProps {
  addresses: Address[];
  isGuest?: boolean;
}

export function CheckoutPageClient({ addresses, isGuest = false }: CheckoutPageClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<'loading' | 'address-input' | 'ready' | 'error' | 'empty-cart'>('loading');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [guestAddress, setGuestAddress] = useState<GuestShippingAddress | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);

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

  // 認証済みユーザー用のチェックアウト初期化
  const initializeAuthenticatedCheckout = async () => {
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

  // ゲスト用のチェックアウト（住所入力後）
  const initializeGuestCheckout = async (address: GuestShippingAddress, email?: string) => {
    if (cart.length === 0) {
      setStep('empty-cart');
      return;
    }

    try {
      setError(null);
      setStep('loading');
      setGuestAddress(address);

      const request: CreateGuestOrderRequest = {
        shipping_address: address,
        payment_method: 'credit_card',
        email,
      };

      const orderResult = await createGuestOrderAction(request);
      if (!orderResult.success || !orderResult.data) {
        setError(orderResult.error || '注文の作成に失敗しました');
        setStep('error');
        return;
      }

      const { order, guest_access_token } = orderResult.data;
      setOrderId(order.id);
      setOrderNumber(order.order_number);
      setSubtotal(order.subtotal ?? computedSubtotal);
      setTotal(order.total);
      setGuestToken(guest_access_token);

      // sessionStorageにゲストトークンを保存
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`guest_order_${order.id}`, guest_access_token);
      }

      const paymentResult = await createGuestPaymentIntentAction(order.id, guest_access_token);
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

    if (isGuest) {
      // ゲストの場合は住所入力画面を表示
      if (cart.length === 0) {
        setStep('empty-cart');
      } else {
        setStep('address-input');
      }
    } else {
      // 認証済みユーザーの場合は直接チェックアウト開始
      void initializeAuthenticatedCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length, isGuest]);

  const totalForSummary = total || (computedSubtotal + 750);
  const displayAddress = isGuest ? guestAddress : defaultAddress;

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
          {isGuest && (
            <p className="text-center text-sm text-gray-600 mt-2">
              ゲスト購入 ・{' '}
              <Link href={ROUTES.AUTH.LOGIN} className="text-primary hover:underline">
                ログインはこちら
              </Link>
            </p>
          )}
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

              {displayAddress && step !== 'address-input' && (
                <div className="mt-5 bg-primary/5 rounded-xl p-4">
                  <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                    配送先
                  </p>
                  <p className="text-sm font-bold text-text-dark">{displayAddress.name || '住所'}</p>
                  <p className="text-xs text-gray-600">〒{displayAddress.postal_code}</p>
                  <p className="text-xs text-gray-600">
                    {displayAddress.prefecture}{displayAddress.city}{displayAddress.address_line1}
                  </p>
                  {displayAddress.address_line2 && (
                    <p className="text-xs text-gray-600">{displayAddress.address_line2}</p>
                  )}
                </div>
              )}

              {!isGuest && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.ACCOUNT.ADDRESSES)}
                    className="w-full px-4 py-3 text-sm font-bold border-2 border-gray-200 text-text-dark rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    住所を変更する
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 右: 住所入力または決済 */}
          <div className="lg:col-span-3">
            {step === 'loading' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="font-bold text-base text-text-dark">準備中...</p>
                </div>
              </div>
            )}

            {step === 'address-input' && isGuest && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-black text-text-dark mb-5">配送先情報</h2>
                <GuestAddressForm
                  onSubmit={initializeGuestCheckout}
                  isSubmitting={false}
                  error={error}
                />
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
                    onClick={() => {
                      if (isGuest) {
                        setStep('address-input');
                      } else {
                        void initializeAuthenticatedCheckout();
                      }
                    }}
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
                  <PaymentForm
                    orderId={orderId}
                    orderNumber={orderNumber}
                    total={totalForSummary}
                    isGuest={isGuest}
                    guestToken={guestToken || undefined}
                  />
                </Elements>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
