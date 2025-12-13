'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckoutForm } from '@/components/checkout';
import { getCart, type CartItem } from '@/lib/cart';
import { formatPrice } from '@/lib/utils';
import type { Address } from '@/lib/server-api';
import { LoadingSpinner } from '@/components/ui';
import { ROUTES } from '@/lib/routes';
import { CART_MESSAGES } from '@/lib/messages';

interface CheckoutContentProps {
  addresses: Address[];
}

export function CheckoutContent({ addresses }: CheckoutContentProps) {
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // カートデータを取得（localStorage）
  useEffect(() => {
    const items = getCart();
    setCartItems(items);
    setIsLoading(false);

    // デフォルト住所を選択
    const defaultAddress = addresses.find((a) => a.is_default);
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
    } else if (addresses.length > 0) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [addresses]);

  useEffect(() => {
    if (selectedAddressId) {
      setIsReady(true);
    }
  }, [selectedAddressId]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal >= 5000 ? 0 : 550;
  const total = subtotal + shipping;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" centered label="読み込み中..." />
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-bg-light">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-4xl font-black mb-4 text-text-dark">{CART_MESSAGES.EMPTY}</h1>
            <p className="text-gray-600 mb-8">
              お買い物を続けて商品をカートに追加してください
            </p>
            <Link
              href={ROUTES.PRODUCTS.INDEX}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl"
            >
              商品を見る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* ページヘッダー */}
        <header className="mb-12 sm:mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-1 w-12 bg-primary" />
            <p className="text-xs tracking-[0.2em] text-primary uppercase font-bold">
              Checkout
            </p>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-text-dark mb-2">
            お支払い手続き
          </h1>
          <p className="text-gray-600">
            配送先とお支払い情報を入力してください
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* 左カラム：配送先・決済 */}
          <div className="lg:col-span-3 space-y-8 order-2 lg:order-1">
            {/* 配送先住所 */}
            <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-text-dark">
                  配送先住所
                </h2>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-6">
                    配送先住所が登録されていません
                  </p>
                  <Link
                    href={ROUTES.ACCOUNT.NEW_ADDRESS}
                    className="inline-flex items-center px-6 py-3 font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all"
                  >
                    住所を追加
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <Link
                    href={ROUTES.ACCOUNT.NEW_ADDRESS}
                    className="block p-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-primary font-bold">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      新しい住所を追加
                    </div>
                  </Link>

                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block p-5 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedAddressId === address.id
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-gray-200 hover:border-primary/50 hover:shadow-sm'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={selectedAddressId === address.id}
                        onChange={(e) => setSelectedAddressId(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all ${
                            selectedAddressId === address.id
                              ? 'border-primary bg-primary'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedAddressId === address.id && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-text-dark mb-2">
                            {address.name || '（名前未設定）'}
                          </p>
                          <p className="text-gray-600 text-sm">〒{address.postal_code}</p>
                          <p className="text-gray-600 text-sm">
                            {address.prefecture}{address.city}{address.address_line1}
                          </p>
                          {address.address_line2 && (
                            <p className="text-gray-600 text-sm">{address.address_line2}</p>
                          )}
                          {address.phone && (
                            <p className="text-gray-600 text-sm mt-1">{address.phone}</p>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* 決済フォーム */}
            {isReady && (
              <CheckoutForm
                cartItems={cartItems}
                shippingAddressId={selectedAddressId}
              />
            )}
          </div>

          {/* 右カラム：注文サマリー */}
          <aside className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm lg:sticky lg:top-28">
              <h2 className="text-xl sm:text-2xl font-black text-text-dark mb-6">注文内容</h2>

              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-20 h-20 relative bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image || '/placeholder.jpg'}
                        alt=""
                        fill
                        className="object-contain p-2"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-text-dark line-clamp-2 mb-1">{item.name}</p>
                      <p className="text-sm text-gray-600 mb-2">数量: {item.quantity}</p>
                      <p className="font-bold text-primary">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <hr className="border-t-2 border-gray-100 mb-6" />

              <dl className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <dt>小計</dt>
                  <dd className="font-bold text-text-dark">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-gray-600">
                  <dt>送料</dt>
                  <dd className="font-bold text-text-dark">
                    {shipping === 0 ? (
                      <span className="text-primary bg-primary/10 px-3 py-1 rounded-full text-sm font-bold">無料</span>
                    ) : (
                      formatPrice(shipping)
                    )}
                  </dd>
                </div>
                <hr className="border-t-2 border-gray-100" />
                <div className="flex justify-between items-baseline pt-2">
                  <dt className="font-bold text-lg text-text-dark">合計</dt>
                  <dd className="text-2xl sm:text-3xl font-black text-primary">{formatPrice(total)}</dd>
                </div>
                <p className="text-xs text-gray-500 text-right">（税込）</p>
              </dl>

              <div className="bg-primary/5 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-dark mb-1">送料無料特典</p>
                    <p className="text-xs text-gray-600">5,000円以上のご注文で送料無料</p>
                  </div>
                </div>
              </div>

              <Link
                href={ROUTES.CART}
                className="flex items-center justify-center gap-2 w-full py-3 font-bold text-primary hover:text-primary-dark transition-colors border-2 border-primary/20 rounded-xl hover:border-primary/40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                カートに戻る
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
