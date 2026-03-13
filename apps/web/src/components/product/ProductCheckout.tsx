'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import {
  fetchAddresses,
  createPaymentIntentAction,
  createGuestOrderAction,
  createGuestPaymentIntentAction,
  prepareJpycPaymentAction,
  prepareJpycPaymentGuestAction,
  verifyJpycPaymentAction,
  verifyJpycPaymentGuestAction,
  type JpycPaymentInfo,
} from '@/lib/actions';
import { addToCart, clearCart } from '@/lib/cart';
import type { Address, CreateOrderItemRequest, GuestShippingAddress, CreateGuestOrderRequest } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import { PAYMENT_MESSAGES } from '@/lib/messages';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { GuestAddressForm } from '@/components/checkout/GuestAddressForm';
import { JpycPaymentForm } from '@/components/web3/JpycPaymentForm';
import { Web3Provider } from '@/components/web3/Web3Provider';
import { formatPrice } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

type PaymentMethod = 'credit_card' | 'jpyc';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface ProductCheckoutProps {
  product: Product;
  quantity: number;
  size?: string;
  variantId?: string;
  onClose: () => void;
}

export default function ProductCheckout({
  product,
  quantity,
  size,
  variantId,
  onClose,
}: ProductCheckoutProps) {
  const { t } = useTranslation('common');
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = (pathname?.split('/')[1] as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);
  const [step, setStep] = useState<'loading' | 'ready' | 'error' | 'address-input' | 'no-address' | 'no-auth' | 'payment-select' | 'stablecoin-select' | 'jpyc-payment'>('loading');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [guestAddress, setGuestAddress] = useState<GuestShippingAddress | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [jpycPaymentInfo, setJpycPaymentInfo] = useState<JpycPaymentInfo | null>(null);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);

  // 重複実行防止用のref
  const isCheckoutInProgressRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // 認証チェック - ゲストの場合は住所入力画面へ
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        setIsGuest(true);
        setStep('address-input');
        return;
      }
    }
  }, [user, authLoading]);

  // 住所を取得
  useEffect(() => {
    if (!user) return;

    const loadAddresses = async () => {
      const result = await fetchAddresses();
      if (!result.success) {
        if (result.error === 'Not authenticated') {
          setStep('no-auth');
        } else {
          setError(result.error || t('checkout.fetchAddressError'));
          setStep('error');
        }
        return;
      }
      // デフォルト住所を取得、なければ最初の住所を使用
      const defaultAddress = result.data.find((a) => a.is_default) || result.data[0];
      if (defaultAddress) {
        setShippingAddress(defaultAddress);
      } else {
        setStep('no-address');
      }
    };

    loadAddresses();
  }, [user]);

  const initializeCheckout = async () => {
    // 重複実行防止
    if (isCheckoutInProgressRef.current) {
      console.log('[ProductCheckout] Already in progress, skipping');
      return;
    }
    isCheckoutInProgressRef.current = true;
    console.log('[ProductCheckout] Starting checkout');

    if (!shippingAddress) {
      isCheckoutInProgressRef.current = false;
      return;
    }

    try {
      setStep('loading');

      // カートをクリアしてから商品を追加（「今すぐ購入」専用）
      await clearCart();
      await addToCart({
        productId: product.id,
        slug: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        image: product.image,
        variantId: variantId,
        size: size,
      });

      // 仮の金額を計算（サーバー側で正確な値が計算される）
      const itemSubtotal = product.price * quantity;
      const estimatedShipping = 750;
      const estimatedTax = Math.round(itemSubtotal * 0.1);
      setSubtotal(itemSubtotal);
      setShippingFee(estimatedShipping);
      setTax(estimatedTax);
      setTotal(itemSubtotal + estimatedShipping + estimatedTax);

      // 支払い方法選択画面を表示
      setStep('payment-select');
      isCheckoutInProgressRef.current = false;
    } catch (err) {
      console.error('[ProductCheckout] Error:', err);
      setError(err instanceof Error ? err.message : PAYMENT_MESSAGES.FAILED);
      setStep('error');
      isCheckoutInProgressRef.current = false;
    }
  };

  // 支払い方法選択後の処理（認証済みユーザー）
  const proceedWithPaymentMethod = async (method: PaymentMethod) => {
    if (!shippingAddress) return;

    setPaymentMethod(method);
    setError(null);
    setStep('loading');

    try {
      if (method === 'credit_card') {
        console.log('[ProductCheckout] Creating payment intent with address:', shippingAddress.id);
        const paymentResult = await createPaymentIntentAction({
          shipping_address_id: shippingAddress.id,
          payment_method: 'credit_card',
        });

        if (!paymentResult.success || !paymentResult.data) {
          setError(paymentResult.error || t('checkout.paymentPrepareError'));
          setStep('error');
          return;
        }

        console.log('[ProductCheckout] Payment intent created');
        setClientSecret(paymentResult.data.client_secret);
        setStep('ready');
      } else if (method === 'jpyc') {
        console.log('[ProductCheckout] Preparing JPYC payment with address:', shippingAddress.id);
        const jpycResult = await prepareJpycPaymentAction({
          shipping_address_id: shippingAddress.id,
        });

        if (!jpycResult.success || !jpycResult.data) {
          setError(jpycResult.error || 'JPYC決済の準備中にエラーが発生しました');
          setStep('error');
          return;
        }

        console.log('[ProductCheckout] JPYC payment prepared:', jpycResult.data.order_id);
        setJpycPaymentInfo(jpycResult.data);
        setOrderId(jpycResult.data.order_id);
        setStep('jpyc-payment');
      }
    } catch (e) {
      console.error('[ProductCheckout] Error:', e);
      setError(e instanceof Error ? e.message : '決済準備に失敗しました');
      setStep('error');
    }
  };

  // 住所が取得できたら決済準備を開始（認証済みユーザーのみ）
  useEffect(() => {
    if (shippingAddress && !isGuest && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      initializeCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingAddress, isGuest]);

  // ゲスト用のチェックアウト（住所入力後 → 支払い方法選択画面へ）
  const initializeGuestCheckout = async (address: GuestShippingAddress, email?: string) => {
    // 重複実行防止
    if (isCheckoutInProgressRef.current) {
      console.log('[ProductCheckout] Already in progress, skipping');
      return;
    }
    isCheckoutInProgressRef.current = true;
    setIsGuestSubmitting(true);
    console.log('[ProductCheckout] Starting guest checkout');

    try {
      setError(null);
      setGuestAddress(address);
      if (email) setGuestEmail(email);

      // 仮の金額を計算
      const itemSubtotal = product.price * quantity;
      const estimatedShipping = 750;
      const estimatedTax = Math.round(itemSubtotal * 0.1);
      setSubtotal(itemSubtotal);
      setShippingFee(estimatedShipping);
      setTax(estimatedTax);
      setTotal(itemSubtotal + estimatedShipping + estimatedTax);

      // 支払い方法選択画面を表示
      setStep('payment-select');
      setIsGuestSubmitting(false);
      isCheckoutInProgressRef.current = false;
    } catch (e) {
      console.error('[ProductCheckout] Error:', e);
      setError(e instanceof Error ? e.message : PAYMENT_MESSAGES.FAILED);
      setStep('error');
      isCheckoutInProgressRef.current = false;
      setIsGuestSubmitting(false);
    }
  };

  // 支払い方法選択後の処理（ゲスト）
  const proceedWithPaymentMethodGuest = async (method: PaymentMethod) => {
    if (!guestAddress) return;

    setPaymentMethod(method);
    setError(null);
    setStep('loading');

    const items: CreateOrderItemRequest[] = [
      {
        product_id: product.id,
        quantity: quantity,
        variant_id: variantId,
        size: size,
      },
    ];

    try {
      if (method === 'credit_card') {
        const request: CreateGuestOrderRequest = {
          items,
          shipping_address: guestAddress,
          payment_method: 'credit_card',
          email: guestEmail || undefined,
        };

        const orderResult = await createGuestOrderAction(request);
        if (!orderResult.success || !orderResult.data) {
          setError(orderResult.error || t('checkout.createOrderError'));
          setStep('error');
          return;
        }

        const { order, guest_access_token } = orderResult.data;
        setOrderId(order.id);
        setOrderNumber(order.order_number);
        setSubtotal(order.subtotal ?? 0);
        setShippingFee(order.shipping_fee ?? 0);
        setTax(order.tax ?? 0);
        setTotal(order.total);
        setGuestToken(guest_access_token);

        console.log('[ProductCheckout] Guest order created:', order.id);

        // sessionStorageにゲストトークンを保存
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`guest_order_${order.id}`, guest_access_token);
        }

        const paymentResult = await createGuestPaymentIntentAction(order.id, guest_access_token);
        if (!paymentResult.success || !paymentResult.data) {
          setError(paymentResult.error || t('checkout.paymentPrepareError'));
          setStep('error');
          return;
        }

        setClientSecret(paymentResult.data.client_secret);
        console.log('[ProductCheckout] Payment intent created');
        setStep('ready');
      } else if (method === 'jpyc') {
        console.log('[ProductCheckout] Preparing JPYC payment for guest');
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

        console.log('[ProductCheckout] JPYC payment prepared:', jpycResult.data.order_id);
        setJpycPaymentInfo(jpycResult.data);
        setOrderId(jpycResult.data.order_id);
        if (jpycResult.data.guest_token) {
          setGuestToken(jpycResult.data.guest_token);
        }
        setStep('jpyc-payment');
      }
    } catch (e) {
      console.error('[ProductCheckout] Error:', e);
      setError(e instanceof Error ? e.message : '決済準備に失敗しました');
      setStep('error');
    }
  };

  // 再試行ハンドラ
  const handleRetry = () => {
    isCheckoutInProgressRef.current = false;
    if (isGuest) {
      setStep('address-input');
    } else {
      initializeCheckout();
    }
  };

  // JPYC決済成功時のハンドラ
  const handleJpycSuccess = useCallback(async (txHash: string) => {
    if (!orderId) return;

    console.log('[ProductCheckout] JPYC payment sent, verifying:', txHash);

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

      console.log('[ProductCheckout] JPYC payment verified:', verifyResult.data);

      // カートをクリア
      clearCart();

      // 完了ページへリダイレクト
      if (isGuest && guestToken) {
        router.push(`${routes.CHECKOUT.COMPLETE}?order_id=${orderId}&guest_token=${encodeURIComponent(guestToken)}`);
      } else {
        router.push(`${routes.CHECKOUT.COMPLETE}?order_id=${orderId}`);
      }
      onClose();
    } catch (e) {
      console.error('[ProductCheckout] JPYC verify error:', e);
      setError(e instanceof Error ? e.message : 'JPYC決済の検証に失敗しました');
      setStep('error');
    }
  }, [orderId, isGuest, guestToken, router, routes, onClose]);

  // JPYC決済エラー時のハンドラ
  const handleJpycError = useCallback((errorMsg: string) => {
    console.error('[ProductCheckout] JPYC payment error:', errorMsg);
    setError(errorMsg);
    // エラーでも再試行できるようにステップはそのまま
  }, []);

  const displayAddress = isGuest ? guestAddress : shippingAddress;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-[#FAFAFA] rounded-2xl shadow-2xl w-full max-w-3xl mx-4 relative">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
          aria-label={t('checkout.close')}
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
              <div className="h-0.5 w-8 bg-primary" />
              <p className="text-xs tracking-[0.2em] text-primary uppercase font-bold">
                Checkout
              </p>
            </div>
            <h2 className="text-xl text-text-dark" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>{t('checkout.payment')}</h2>
            {isGuest && (
              <p className="text-sm text-gray-600 mt-2">
                {t('checkout.guestPurchase')}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {/* 左: 商品情報（見積書風） */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl p-5 shadow-sm sticky top-8">
                <h3 className="text-base font-black text-text-dark mb-5">{t('checkout.orderSummary')}</h3>

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
                    <p className="font-bold text-text-dark text-xs mb-1 line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-600 mb-1.5">{t('checkout.quantity')}: {quantity}</p>
                    <p className="font-bold text-primary text-sm">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </div>

                {/* 金額内訳 */}
                <dl className="space-y-2.5 mb-5">
                  <div className="flex justify-between text-xs text-gray-600">
                    <dt>{t('checkout.subtotal')}</dt>
                    <dd className="font-bold text-text-dark">{formatPrice(subtotal || product.price * quantity)}</dd>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <dt>{t('checkout.shipping')}</dt>
                    <dd className="font-bold text-text-dark">{formatPrice(shippingFee || 750)}</dd>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <dt>{t('checkout.tax')}</dt>
                    <dd className="font-bold text-text-dark">{formatPrice(tax || Math.round((product.price * quantity) * 0.1))}</dd>
                  </div>
                  <div className="pt-2.5 border-t-2 border-gray-100 flex justify-between items-baseline">
                    <dt className="font-bold text-text-dark text-sm">{t('checkout.total')}</dt>
                    <dd className="text-xl font-black text-primary">{formatPrice(total || (product.price * quantity + 750 + Math.round((product.price * quantity) * 0.1)))}</dd>
                  </div>
                </dl>

                {/* 配送先 */}
                {displayAddress && step !== 'address-input' && (
                  <div className="bg-primary/5 rounded-lg p-3">
                    <p className="text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                      {t('checkout.shippingAddress')}
                    </p>
                    {displayAddress.name && (
                      <p className="text-xs font-bold text-text-dark mb-1">{displayAddress.name}</p>
                    )}
                    <p className="text-xs text-gray-600">〒{displayAddress.postal_code}</p>
                    <p className="text-xs text-gray-600">
                      {displayAddress.prefecture}
                      {displayAddress.city}
                      {displayAddress.address_line1}
                    </p>
                    {displayAddress.address_line2 && (
                      <p className="text-xs text-gray-600">{displayAddress.address_line2}</p>
                    )}
                    {('phone' in displayAddress) && displayAddress.phone && (
                      <p className="text-xs text-gray-600 mt-1">{displayAddress.phone}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 右: 決済フォーム */}
            <div className="md:col-span-3">
              {step === 'loading' && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="font-bold text-base text-text-dark">{t('checkout.preparing')}</p>
                  </div>
                </div>
              )}

              {step === 'address-input' && isGuest && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-black text-text-dark">{t('checkout.shippingInfo')}</h3>
                    <p className="text-xs text-gray-500">
                      <Link href={routes.AUTH.LOGIN} className="text-primary hover:underline">
                        {t('checkout.loginHere')}
                      </Link>
                    </p>
                  </div>
                  <GuestAddressForm
                    onSubmit={initializeGuestCheckout}
                    isSubmitting={isGuestSubmitting}
                    error={error}
                  />
                </div>
              )}

              {step === 'no-address' && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <p className="font-bold text-lg text-text-dark mb-3">{t('checkout.noAddressTitle')}</p>
                    <p className="text-gray-600 text-center text-sm mb-5">
                      {t('checkout.noAddressDesc')}
                    </p>
                    <button
                      onClick={() => {
                          router.push(`${routes.ACCOUNT.NEW_ADDRESS}?redirect=${encodeURIComponent(routes.CHECKOUT.INDEX)}`);
                        onClose();
                      }}
                      className="px-5 py-2.5 font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all text-sm"
                    >
                      {t('checkout.registerAddress')}
                    </button>
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
                    <p className="font-bold text-lg text-red-500 mb-3">{t('checkout.errorOccurred')}</p>
                    <p className="text-gray-600 text-center text-sm mb-5">{error}</p>
                    <button
                      onClick={handleRetry}
                      className="px-5 py-2.5 font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all text-sm"
                    >
                      {t('checkout.retry')}
                    </button>
                  </div>
                </div>
              )}

              {/* 支払い方法選択 */}
              {step === 'payment-select' && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-base font-black text-text-dark mb-5">{t('checkout.selectPaymentMethod')}</h3>
                  <div className="space-y-3">
                    {/* カード・電子決済 */}
                    <button
                      type="button"
                      onClick={() => isGuest ? proceedWithPaymentMethodGuest('credit_card') : proceedWithPaymentMethod('credit_card')}
                      className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-dark text-sm">{t('checkout.cardPayment')}</p>
                        <p className="text-[10px] text-gray-500 truncate">{t('checkout.cardPaymentDesc')}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* ステーブルコイン */}
                    <button
                      type="button"
                      onClick={() => setStep('stablecoin-select')}
                      className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v12M6 12h12" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-dark text-sm">{t('checkout.stablecoin')}</p>
                        <p className="text-[10px] text-gray-500 truncate">{t('checkout.stablecoinDesc')}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* ステーブルコイン選択 */}
              {step === 'stablecoin-select' && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-black text-text-dark">{t('checkout.selectStablecoin')}</h3>
                    <button
                      type="button"
                      onClick={() => setStep('payment-select')}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      ← {t('checkout.back')}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {/* JPYC */}
                    <button
                      type="button"
                      onClick={() => isGuest ? proceedWithPaymentMethodGuest('jpyc') : proceedWithPaymentMethod('jpyc')}
                      className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-600 font-bold text-xs">JPYC</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-dark text-sm">{t('checkout.jpyc')}</p>
                        <p className="text-[10px] text-gray-500 truncate">{t('checkout.jpycDesc')}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* USDC - Coming Soon */}
                    <div className="w-full flex items-center gap-3 p-3 border-2 border-gray-100 rounded-xl bg-gray-50 opacity-60 cursor-not-allowed">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 font-bold text-xs">USDC</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-400 text-sm">USDC</p>
                        <p className="text-[10px] text-gray-400 truncate">{t('checkout.comingSoon')}</p>
                      </div>
                    </div>

                    {/* USDT - Coming Soon */}
                    <div className="w-full flex items-center gap-3 p-3 border-2 border-gray-100 rounded-xl bg-gray-50 opacity-60 cursor-not-allowed">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 font-bold text-xs">USDT</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-400 text-sm">USDT</p>
                        <p className="text-[10px] text-gray-400 truncate">{t('checkout.comingSoon')}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500 mt-3 text-center">
                    {t('checkout.jpycNote')}
                  </p>
                </div>
              )}

              {/* JPYC決済フォーム */}
              {step === 'jpyc-payment' && jpycPaymentInfo && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-black text-text-dark">{t('checkout.jpycPayment')}</h3>
                    <button
                      type="button"
                      onClick={() => setStep('stablecoin-select')}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      ← {t('checkout.back')}
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

              {step === 'ready' && clientSecret && (isGuest ? (orderId && orderNumber) : true) && (
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
                    <PaymentForm
                      orderId={orderId || undefined}
                      orderNumber={orderNumber || undefined}
                      total={total}
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
    </div>
  );
}
