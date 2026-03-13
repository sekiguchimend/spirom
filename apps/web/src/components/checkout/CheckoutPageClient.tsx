'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { Address, CartItem, GuestShippingAddress, CreateGuestOrderRequest, CreateOrderItemRequest } from '@/types';
import { getStripe } from '@/lib/stripe';
import { formatPrice } from '@/lib/utils';
import {
  createPaymentIntentAction,
  createGuestOrderAction,
  createGuestPaymentIntentAction,
  prepareJpycPaymentAction,
  prepareJpycPaymentGuestAction,
  verifyJpycPaymentAction,
  verifyJpycPaymentGuestAction,
  type JpycPaymentInfo,
} from '@/lib/actions';
import { getCart, refreshCart, clearCart } from '@/lib/cart';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import { calculateShipping, SHIPPING_RATES } from '@/lib/shipping';
import { getShippingRegion } from '@/lib/i18n/geo';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { GuestAddressForm } from '@/components/checkout/GuestAddressForm';
import { getCountryName } from '@/components/address/countries';
import { JpycPaymentForm } from '@/components/web3/JpycPaymentForm';
import { Web3Provider } from '@/components/web3/Web3Provider';

type PaymentMethod = 'credit_card' | 'jpyc';

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
  const pathname = usePathname();
  const locale = (pathname?.split('/')[1] as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);
  const [step, setStep] = useState<'loading' | 'address-input' | 'payment-select' | 'stablecoin-select' | 'ready' | 'jpyc-payment' | 'error' | 'empty-cart'>('loading');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestAddress, setGuestAddress] = useState<GuestShippingAddress | null>(null);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('JP');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [jpycPaymentInfo, setJpycPaymentInfo] = useState<JpycPaymentInfo | null>(null);

  // 注文情報のstate
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);

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

  // 認証済みユーザー用のチェックアウト初期化（支払い方法選択画面へ）
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
      router.push(`${routes.ACCOUNT.NEW_ADDRESS}?redirect=${encodeURIComponent(routes.CHECKOUT.INDEX)}`);
      return;
    }

    // 支払い方法選択画面を表示
    setSubtotal(computedSubtotal);
    setTotal(computedSubtotal + calculateShipping(computedSubtotal, defaultAddress.country || 'JP') + Math.round(computedSubtotal * 0.1));
    setStep('payment-select');
    isCheckoutInProgressRef.current = false;
  }

  // 支払い方法選択後の処理（認証済みユーザー）
  async function proceedWithPaymentMethod(method: PaymentMethod) {
    if (!defaultAddress) return;

    setPaymentMethod(method);
    setError(null);
    setStep('loading');

    try {
      if (method === 'credit_card') {
        console.log('[Checkout] Creating payment intent with address:', defaultAddress.id);
        const paymentResult = await createPaymentIntentAction({
          shipping_address_id: defaultAddress.id,
          payment_method: 'credit_card',
        });

        if (!paymentResult.success || !paymentResult.data) {
          setError(paymentResult.error || '決済の準備中にエラーが発生しました');
          setStep('error');
          return;
        }

        console.log('[Checkout] Payment intent created');
        setClientSecret(paymentResult.data.client_secret);
        setStep('ready');
      } else if (method === 'jpyc') {
        console.log('[Checkout] Preparing JPYC payment with address:', defaultAddress.id);
        const jpycResult = await prepareJpycPaymentAction({
          shipping_address_id: defaultAddress.id,
        });

        if (!jpycResult.success || !jpycResult.data) {
          setError(jpycResult.error || 'JPYC決済の準備中にエラーが発生しました');
          setStep('error');
          return;
        }

        console.log('[Checkout] JPYC payment prepared:', jpycResult.data.order_id);
        setJpycPaymentInfo(jpycResult.data);
        setOrderId(jpycResult.data.order_id);
        setStep('jpyc-payment');
      }
    } catch (e) {
      console.error('[Checkout] Error:', e);
      setError(e instanceof Error ? e.message : '決済準備に失敗しました');
      setStep('error');
    }
  }

  // ゲスト用のチェックアウト（住所入力後 → 支払い方法選択画面へ）
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

    setGuestAddress(address);
    if (email) setGuestEmail(email);
    setSubtotal(computedSubtotal);
    setTotal(computedSubtotal + calculateShipping(computedSubtotal, address.country || 'JP') + Math.round(computedSubtotal * 0.1));
    setStep('payment-select');
    setIsGuestSubmitting(false);
    isCheckoutInProgressRef.current = false;
  }

  // 支払い方法選択後の処理（ゲスト）
  async function proceedWithPaymentMethodGuest(method: PaymentMethod) {
    if (!guestAddress) return;

    setPaymentMethod(method);
    setError(null);
    setStep('loading');

    const currentCart = getCart();
    const items: CreateOrderItemRequest[] = currentCart.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      variant_id: item.variantId,
      size: item.size,
    }));

    try {
      if (method === 'credit_card') {
        // sessionStorageから既存の注文を確認
        const savedOrder = getCheckoutOrder();
        const savedGuestToken = getCheckoutGuestToken();
        let currentOrderId = savedOrder?.orderId || null;
        let currentGuestToken = savedGuestToken || null;

        // 注文がまだ作成されていない場合のみ作成
        if (!currentOrderId) {
          console.log('[Checkout] Creating new guest order');
          const request: CreateGuestOrderRequest = {
            shipping_address: guestAddress,
            payment_method: 'credit_card',
            email: guestEmail || undefined,
            items,
          };

          const orderResult = await createGuestOrderAction(request);
          if (!orderResult.success || !orderResult.data) {
            setError(orderResult.error || '注文の作成に失敗しました');
            setStep('error');
            return;
          }

          const { order, guest_access_token } = orderResult.data;
          currentOrderId = order.id;
          currentGuestToken = guest_access_token;

          saveCheckoutOrder(order.id, order.order_number, order.total, guest_access_token);
          setOrderId(order.id);
          setOrderNumber(order.order_number);
          setSubtotal(order.subtotal ?? computedSubtotal);
          setTotal(order.total);
          setGuestToken(guest_access_token);
        } else {
          setOrderId(currentOrderId);
          if (currentGuestToken) setGuestToken(currentGuestToken);
        }

        if (!currentGuestToken) {
          setError('ゲストトークンが見つかりません');
          setStep('error');
          return;
        }

        // PaymentIntent作成
        const paymentResult = await createGuestPaymentIntentAction(currentOrderId, currentGuestToken);
        if (!paymentResult.success || !paymentResult.data) {
          setError(paymentResult.error || '決済の準備中にエラーが発生しました');
          setStep('error');
          return;
        }

        setClientSecret(paymentResult.data.client_secret);
        setStep('ready');
      } else if (method === 'jpyc') {
        console.log('[Checkout] Preparing JPYC payment for guest');
        const jpycResult = await prepareJpycPaymentGuestAction({
          shipping_address: guestAddress,
          email: guestEmail || undefined,
          items,
        });

        if (!jpycResult.success || !jpycResult.data) {
          setError(jpycResult.error || 'JPYC決済の準備中にエラーが発生しました');
          setStep('error');
          return;
        }

        console.log('[Checkout] JPYC payment prepared:', jpycResult.data.order_id);
        setJpycPaymentInfo(jpycResult.data);
        setOrderId(jpycResult.data.order_id);
        if (jpycResult.data.guest_token) {
          setGuestToken(jpycResult.data.guest_token);
        }
        setStep('jpyc-payment');
      }
    } catch (e) {
      console.error('[Checkout] Error:', e);
      setError(e instanceof Error ? e.message : '決済準備に失敗しました');
      setStep('error');
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

  // JPYC決済成功時のハンドラ
  const handleJpycSuccess = useCallback(async (txHash: string) => {
    if (!orderId) return;

    console.log('[Checkout] JPYC payment sent, verifying:', txHash);

    try {
      let verifyResult;
      if (isGuest && guestToken) {
        verifyResult = await verifyJpycPaymentGuestAction({
          order_id: orderId,
          tx_hash: txHash,
          guest_token: guestToken,
        });
      } else {
        verifyResult = await verifyJpycPaymentAction({
          order_id: orderId,
          tx_hash: txHash,
        });
      }

      if (!verifyResult.success || !verifyResult.data?.success) {
        setError(verifyResult.error || 'JPYC決済の検証に失敗しました');
        setStep('error');
        return;
      }

      console.log('[Checkout] JPYC payment verified:', verifyResult.data);

      // カートをクリア
      clearCart();
      clearCheckoutOrder();

      // 完了ページへリダイレクト
      if (isGuest && guestToken) {
        router.push(`${routes.CHECKOUT.COMPLETE}?order_id=${orderId}&guest_token=${encodeURIComponent(guestToken)}`);
      } else {
        router.push(`${routes.CHECKOUT.COMPLETE}?order_id=${orderId}`);
      }
    } catch (e) {
      console.error('[Checkout] JPYC verify error:', e);
      setError(e instanceof Error ? e.message : 'JPYC決済の検証に失敗しました');
      setStep('error');
    }
  }, [orderId, isGuest, guestToken, router, routes]);

  // JPYC決済エラー時のハンドラ
  const handleJpycError = useCallback((errorMsg: string) => {
    console.error('[Checkout] JPYC payment error:', errorMsg);
    setError(errorMsg);
    // エラーでも再試行できるようにステップはそのまま
  }, []);

  // 国に基づいて送料を計算
  const currentCountry = isGuest ? selectedCountry : (defaultAddress?.country || 'JP');
  const shippingFeeForSummary = calculateShipping(computedSubtotal, currentCountry);
  const taxForSummary = Math.round(computedSubtotal * 0.1);
  const totalForSummary = total || (computedSubtotal + shippingFeeForSummary + taxForSummary);
  const displayAddress = isGuest ? guestAddress : defaultAddress;

  // 送料無料までの残り金額
  const shippingRegion = getShippingRegion(currentCountry);
  const freeShippingThreshold = SHIPPING_RATES[shippingRegion].freeThreshold;
  const amountToFreeShipping = freeShippingThreshold - computedSubtotal;

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
              <Link href={routes.AUTH.LOGIN} className="text-primary hover:underline">
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
                        {item.name}
                        {item.size && <span className="text-gray-500"> ({item.size})</span>}
                        {' × '}{item.quantity}
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
                  <span>送料（{getCountryName(currentCountry, locale)}）</span>
                  <span className="font-bold text-text-dark">
                    {shippingFeeForSummary === 0 ? '無料' : formatPrice(shippingFeeForSummary)}
                  </span>
                </div>
                {amountToFreeShipping > 0 && shippingFeeForSummary > 0 && (
                  <p className="text-xs text-primary">
                    あと{formatPrice(amountToFreeShipping)}で送料無料！
                  </p>
                )}
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
                    onClick={() => router.push(routes.ACCOUNT.ADDRESSES)}
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
                  onCountryChange={setSelectedCountry}
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
                    onClick={() => router.push(routes.PRODUCTS.INDEX)}
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

            {/* 支払い方法選択 */}
            {step === 'payment-select' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-black text-text-dark mb-5">支払い方法を選択</h2>
                <div className="space-y-4">
                  {/* カード・電子決済 */}
                  <button
                    type="button"
                    onClick={() => isGuest ? proceedWithPaymentMethodGuest('credit_card') : proceedWithPaymentMethod('credit_card')}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-text-dark">カード・電子決済</p>
                      <p className="text-xs text-gray-500">Visa, Mastercard, Apple Pay, Google Pay など</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* ステーブルコイン */}
                  <button
                    type="button"
                    onClick={() => setStep('stablecoin-select')}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v12M6 12h12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-text-dark">ステーブルコイン</p>
                      <p className="text-xs text-gray-500">JPYC など・ウォレット接続</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ステーブルコイン選択 */}
            {step === 'stablecoin-select' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-black text-text-dark">ステーブルコインを選択</h2>
                  <button
                    type="button"
                    onClick={() => setStep('payment-select')}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← 戻る
                  </button>
                </div>
                <div className="space-y-4">
                  {/* JPYC */}
                  <button
                    type="button"
                    onClick={() => isGuest ? proceedWithPaymentMethodGuest('jpyc') : proceedWithPaymentMethod('jpyc')}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-sm">JPYC</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-text-dark">JPYC</p>
                      <p className="text-xs text-gray-500">日本円連動型ステーブルコイン（Polygon）</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* USDC - Coming Soon */}
                  <div className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 rounded-xl bg-gray-50 opacity-60 cursor-not-allowed">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                      <span className="text-blue-400 font-bold text-sm">USDC</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-400">USDC</p>
                      <p className="text-xs text-gray-400">近日対応予定</p>
                    </div>
                  </div>

                  {/* USDT - Coming Soon */}
                  <div className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 rounded-xl bg-gray-50 opacity-60 cursor-not-allowed">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                      <span className="text-green-400 font-bold text-sm">USDT</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-400">USDT</p>
                      <p className="text-xs text-gray-400">近日対応予定</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4 text-center">
                  MetaMask等のウォレットが必要です
                </p>
              </div>
            )}

            {/* JPYC決済フォーム */}
            {step === 'jpyc-payment' && jpycPaymentInfo && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-black text-text-dark">JPYC決済</h2>
                  <button
                    type="button"
                    onClick={() => setStep('stablecoin-select')}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← 戻る
                  </button>
                </div>
                <Web3Provider>
                  <JpycPaymentForm
                    orderId={jpycPaymentInfo.order_id}
                    amountJpyc={jpycPaymentInfo.amount_jpyc}
                    recipientAddress={jpycPaymentInfo.recipient_address}
                    contractAddress={jpycPaymentInfo.contract_address}
                    chainId={jpycPaymentInfo.chain_id}
                    requiredConfirmations={jpycPaymentInfo.required_confirmations}
                    onSuccess={handleJpycSuccess}
                    onError={handleJpycError}
                  />
                </Web3Provider>
              </div>
            )}

            {step === 'ready' && clientSecret && (
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
                    orderId={orderId || undefined}
                    orderNumber={orderNumber || undefined}
                    total={totalForSummary}
                    isGuest={isGuest}
                    guestToken={guestToken || undefined}
                    locale={locale}
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
