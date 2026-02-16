'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

// sessionStorageのキー
const CHECKOUT_ORDER_KEY = 'spirom_checkout_order';
const CHECKOUT_GUEST_TOKEN_KEY = 'spirom_checkout_guest_token';

interface CheckoutOrderData {
  orderId: string;
  orderNumber: string;
  total: number;
  timestamp: number;
}

// 進行中の注文情報を保存
function saveCheckoutOrder(orderId: string, orderNumber: string, total: number, guestToken?: string) {
  if (typeof window === 'undefined') return;
  const data: CheckoutOrderData = { orderId, orderNumber, total, timestamp: Date.now() };
  sessionStorage.setItem(CHECKOUT_ORDER_KEY, JSON.stringify(data));
  if (guestToken) {
    sessionStorage.setItem(CHECKOUT_GUEST_TOKEN_KEY, guestToken);
  }
}

// 進行中の注文情報を取得（30分以内のもののみ有効）
function getCheckoutOrder(): CheckoutOrderData | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = sessionStorage.getItem(CHECKOUT_ORDER_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data) as CheckoutOrderData;
    // 30分以上経過した注文は無効
    if (Date.now() - parsed.timestamp > 30 * 60 * 1000) {
      clearCheckoutOrder();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function getCheckoutGuestToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(CHECKOUT_GUEST_TOKEN_KEY);
}

// 注文情報をクリア（決済完了時に呼ぶ）
export function clearCheckoutOrder() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CHECKOUT_ORDER_KEY);
  sessionStorage.removeItem(CHECKOUT_GUEST_TOKEN_KEY);
}

interface CheckoutPageClientProps {
  addresses: Address[];
  isGuest?: boolean;
}

export function CheckoutPageClient({ addresses, isGuest = false }: CheckoutPageClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<'loading' | 'address-input' | 'ready' | 'error' | 'empty-cart'>('loading');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestAddress, setGuestAddress] = useState<GuestShippingAddress | null>(null);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);

  // 注文情報のstate
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [guestToken, setGuestToken] = useState<string | null>(null);

  // 重複実行防止用のref（コンポーネントライフサイクル全体で共有）
  const isCheckoutInProgressRef = useRef(false);
  const hasTriggeredCheckoutRef = useRef(false);

  const defaultAddress = useMemo(
    () => addresses.find((a) => a.is_default) || addresses[0] || null,
    [addresses]
  );

  const computedSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  // カートの読み込み
  useEffect(() => {
    void refreshCart()
      .then(() => {
        const c = getCart();
        setCart(c);
      })
      .catch(() => setCart(getCart()));
  }, []);

  // 認証済みユーザー用のチェックアウト初期化
  async function initializeAuthenticatedCheckout() {
    // 既にチェックアウト処理中なら何もしない
    if (isCheckoutInProgressRef.current) {
      console.log('[Checkout] Already in progress, skipping');
      return;
    }
    isCheckoutInProgressRef.current = true;
    console.log('[Checkout] Starting authenticated checkout');

    const currentCart = getCart();
    if (currentCart.length === 0) {
      isCheckoutInProgressRef.current = false;
      setStep('empty-cart');
      return;
    }

    if (!defaultAddress) {
      isCheckoutInProgressRef.current = false;
      router.push(`${ROUTES.ACCOUNT.NEW_ADDRESS}?redirect=${encodeURIComponent(ROUTES.CHECKOUT.INDEX)}`);
      return;
    }

    try {
      setError(null);
      setStep('loading');

      // まずsessionStorageから既存の注文を確認
      const savedOrder = getCheckoutOrder();
      let currentOrderId = savedOrder?.orderId || null;
      let currentOrderNumber = savedOrder?.orderNumber || null;
      let currentTotal = savedOrder?.total || 0;

      console.log('[Checkout] Saved order:', savedOrder);

      // 注文がまだ作成されていない場合のみ作成
      if (!currentOrderId) {
        console.log('[Checkout] Creating new order');
        const request: CreateOrderRequest = {
          shipping_address_id: defaultAddress.id,
          payment_method: 'credit_card',
        };

        const orderResult = await createOrderAction(request);
        if (!orderResult.success || !orderResult.data) {
          setError(orderResult.error || '注文の作成に失敗しました');
          setStep('error');
          isCheckoutInProgressRef.current = false;
          return;
        }

        const order = orderResult.data;
        currentOrderId = order.id;
        currentOrderNumber = order.order_number;
        currentTotal = order.total;

        console.log('[Checkout] Order created:', order.id);

        // sessionStorageに保存
        saveCheckoutOrder(order.id, order.order_number, order.total);

        // stateも更新
        setOrderId(order.id);
        setOrderNumber(order.order_number);
        setSubtotal(order.subtotal ?? computedSubtotal);
        setTotal(order.total);
      } else {
        console.log('[Checkout] Reusing existing order:', currentOrderId);
        // 既存の注文情報をstateに反映
        setOrderId(currentOrderId);
        setOrderNumber(currentOrderNumber);
        setTotal(currentTotal);
      }

      // PaymentIntent作成
      console.log('[Checkout] Creating payment intent for order:', currentOrderId);
      const paymentResult = await createPaymentIntentAction(currentOrderId);
      if (!paymentResult.success || !paymentResult.data) {
        setError(paymentResult.error || '決済の準備中にエラーが発生しました');
        setStep('error');
        isCheckoutInProgressRef.current = false;
        return;
      }

      console.log('[Checkout] Payment intent created');
      setClientSecret(paymentResult.data.client_secret);
      setStep('ready');
    } catch (e) {
      console.error('[Checkout] Error:', e);
      setError(e instanceof Error ? e.message : '決済準備に失敗しました');
      setStep('error');
      isCheckoutInProgressRef.current = false;
    }
  }

  // ゲスト用のチェックアウト（住所入力後）
  async function initializeGuestCheckout(address: GuestShippingAddress, email?: string) {
    // 既にチェックアウト処理中なら何もしない
    if (isCheckoutInProgressRef.current) {
      console.log('[Checkout] Already in progress, skipping');
      return;
    }
    isCheckoutInProgressRef.current = true;
    setIsGuestSubmitting(true);
    console.log('[Checkout] Starting guest checkout');

    const currentCart = getCart();
    if (currentCart.length === 0) {
      isCheckoutInProgressRef.current = false;
      setIsGuestSubmitting(false);
      setStep('empty-cart');
      return;
    }

    try {
      setError(null);
      setStep('loading');
      setGuestAddress(address);

      // sessionStorageから既存の注文を確認
      const savedOrder = getCheckoutOrder();
      const savedGuestToken = getCheckoutGuestToken();
      let currentOrderId = savedOrder?.orderId || null;
      let currentGuestToken = savedGuestToken || null;

      console.log('[Checkout] Saved order:', savedOrder);

      // 注文がまだ作成されていない場合のみ作成
      if (!currentOrderId) {
        console.log('[Checkout] Creating new guest order');
        const request: CreateGuestOrderRequest = {
          shipping_address: address,
          payment_method: 'credit_card',
          email,
        };

        const orderResult = await createGuestOrderAction(request);
        if (!orderResult.success || !orderResult.data) {
          setError(orderResult.error || '注文の作成に失敗しました');
          setStep('error');
          isCheckoutInProgressRef.current = false;
          setIsGuestSubmitting(false);
          return;
        }

        const { order, guest_access_token } = orderResult.data;
        currentOrderId = order.id;
        currentGuestToken = guest_access_token;

        console.log('[Checkout] Guest order created:', order.id);

        // sessionStorageに保存
        saveCheckoutOrder(order.id, order.order_number, order.total, guest_access_token);

        // stateも更新
        setOrderId(order.id);
        setOrderNumber(order.order_number);
        setSubtotal(order.subtotal ?? computedSubtotal);
        setTotal(order.total);
        setGuestToken(guest_access_token);
      } else {
        console.log('[Checkout] Reusing existing guest order:', currentOrderId);
        // 既存の注文情報をstateに反映
        setOrderId(currentOrderId);
        if (currentGuestToken) setGuestToken(currentGuestToken);
      }

      if (!currentGuestToken) {
        setError('ゲストトークンが見つかりません');
        setStep('error');
        isCheckoutInProgressRef.current = false;
        setIsGuestSubmitting(false);
        return;
      }

      // PaymentIntent作成
      console.log('[Checkout] Creating payment intent for guest order:', currentOrderId);
      const paymentResult = await createGuestPaymentIntentAction(currentOrderId, currentGuestToken);
      if (!paymentResult.success || !paymentResult.data) {
        setError(paymentResult.error || '決済の準備中にエラーが発生しました');
        setStep('error');
        isCheckoutInProgressRef.current = false;
        setIsGuestSubmitting(false);
        return;
      }

      console.log('[Checkout] Payment intent created');
      setClientSecret(paymentResult.data.client_secret);
      setStep('ready');
      setIsGuestSubmitting(false);
    } catch (e) {
      console.error('[Checkout] Error:', e);
      setError(e instanceof Error ? e.message : '決済準備に失敗しました');
      setStep('error');
      isCheckoutInProgressRef.current = false;
      setIsGuestSubmitting(false);
    }
  }

  // カート読み込み完了後に一度だけチェックアウト処理を開始
  useEffect(() => {
    // カートがまだ読み込まれていない場合は何もしない
    // (初期状態は空配列だが、refreshCartが完了するまで待つ)
    if (cart.length === 0) {
      // ただし、sessionStorageに注文があるかチェック
      const savedOrder = getCheckoutOrder();
      if (!savedOrder) {
        // 注文もカートもない場合、cartの更新を待つか空カート表示
        // 最初のレンダリングではまだcartが読み込まれていないのでreturn
        return;
      }
    }

    // 既にトリガー済みなら何もしない
    if (hasTriggeredCheckoutRef.current) {
      return;
    }

    // カートが本当に空（読み込み完了後）かチェック
    const currentCart = getCart();
    const savedOrder = getCheckoutOrder();

    if (currentCart.length === 0 && !savedOrder) {
      setStep('empty-cart');
      return;
    }

    hasTriggeredCheckoutRef.current = true;

    if (isGuest) {
      // ゲストの場合
      if (savedOrder) {
        // 既存の注文がある場合は決済画面へ（住所は注文に含まれている）
        void initializeGuestCheckout({} as GuestShippingAddress);
      } else {
        // 新規の場合は住所入力画面を表示
        setStep('address-input');
      }
    } else {
      // 認証済みユーザーの場合は直接チェックアウト開始
      void initializeAuthenticatedCheckout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length, isGuest]);

  // 再試行ボタン用のハンドラ
  function handleRetry() {
    // エラーからの再試行時はrefをリセット
    isCheckoutInProgressRef.current = false;

    if (isGuest) {
      setStep('address-input');
    } else {
      void initializeAuthenticatedCheckout();
    }
  }

  const shippingFeeForSummary = 750;
  const taxForSummary = Math.round(computedSubtotal * 0.1);
  const totalForSummary = total || (computedSubtotal + shippingFeeForSummary + taxForSummary);
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
                  <span>送料</span>
                  <span className="font-bold text-text-dark">{formatPrice(shippingFeeForSummary)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>消費税（10%）</span>
                  <span className="font-bold text-text-dark">{formatPrice(taxForSummary)}</span>
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
                  isSubmitting={isGuestSubmitting}
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
                    onClick={handleRetry}
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
