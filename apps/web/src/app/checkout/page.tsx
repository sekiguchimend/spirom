'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckoutForm } from '@/components/checkout';

// TODO: 実際の実装では認証状態とカートデータをグローバル状態から取得
// モックデータ
const mockCartItems = [
  {
    id: '1',
    productId: '1',
    slug: 'organic-cotton-tote',
    name: 'オーガニックコットントート',
    price: 3800,
    quantity: 2,
    image: '/products/tote.jpg',
  },
  {
    id: '2',
    productId: '4',
    slug: 'wooden-coaster',
    name: '天然木コースター 4枚組',
    price: 1800,
    quantity: 1,
    image: '/products/coaster.jpg',
  },
];

const mockAddresses = [
  {
    id: 'addr-1',
    name: '山田 太郎',
    postal_code: '150-0001',
    prefecture: '東京都',
    city: '渋谷区',
    address_line1: '神宮前1-2-3',
    address_line2: 'サンプルマンション101',
    phone: '03-1234-5678',
    is_default: true,
  },
];

// モックトークン（実際の実装では認証から取得）
const mockToken = 'mock-jwt-token';

function formatPrice(price: number): string {
  return `¥${price.toLocaleString()}`;
}

export default function CheckoutPage() {
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    mockAddresses.find((a) => a.is_default)?.id || ''
  );
  const [isReady, setIsReady] = useState(false);

  const cartItems = mockCartItems;
  const addresses = mockAddresses;
  const token = mockToken;

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal >= 5000 ? 0 : 550;
  const total = subtotal + shipping;

  useEffect(() => {
    // 住所が選択されていれば決済準備完了
    if (selectedAddressId) {
      setIsReady(true);
    }
  }, [selectedAddressId]);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFFF5]">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-4xl font-black mb-4 text-black">カートが空です</h1>
            <p className="text-gray-600 mb-8">
              お買い物を続けて商品をカートに追加してください
            </p>
            <Link
              href="/products"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-black uppercase tracking-wider bg-black text-white border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
            >
              商品を見る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-20">
        {/* ページヘッダー */}
        <header className="text-center mb-8 sm:mb-16">
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black mb-2 sm:mb-4 tracking-wide text-black"
            style={{ fontFamily: 'var(--font-anton), sans-serif' }}
          >
            CHECKOUT
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 font-bold uppercase tracking-wider">
            お支払い手続き
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* 左カラム：配送先・決済 */}
          <div className="space-y-4 sm:space-y-8 order-2 lg:order-1">
            {/* 配送先住所 */}
            <section className="bg-white border-3 sm:border-4 border-black rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wide mb-4 sm:mb-6 text-black">
                配送先住所
              </h2>

              {addresses.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">
                    配送先住所が登録されていません
                  </p>
                  <Link
                    href="/account/addresses/new"
                    className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-black uppercase tracking-wider bg-black text-white border-2 sm:border-3 border-black rounded-lg sm:rounded-xl shadow-[3px_3px_0px_0px_rgba(125,255,58,1)] sm:shadow-[4px_4px_0px_0px_rgba(125,255,58,1)]"
                  >
                    住所を追加
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block p-3 sm:p-4 border-2 sm:border-3 rounded-lg sm:rounded-xl cursor-pointer transition-all ${
                        selectedAddressId === address.id
                          ? 'border-black bg-[#7dff3a]/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                          : 'border-gray-300 hover:border-black'
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
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div
                          className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 sm:border-3 flex-shrink-0 mt-0.5 sm:mt-1 ${
                            selectedAddressId === address.id
                              ? 'border-black bg-black'
                              : 'border-gray-400'
                          }`}
                        >
                          {selectedAddressId === address.id && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-sm sm:text-base">{address.name}</p>
                          <p className="text-gray-600 text-xs sm:text-sm mt-1">
                            〒{address.postal_code}
                          </p>
                          <p className="text-gray-600 text-xs sm:text-sm break-all">
                            {address.prefecture}
                            {address.city}
                            {address.address_line1}
                          </p>
                          {address.address_line2 && (
                            <p className="text-gray-600 text-xs sm:text-sm break-all">
                              {address.address_line2}
                            </p>
                          )}
                          <p className="text-gray-600 text-xs sm:text-sm mt-1">
                            {address.phone}
                          </p>
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
                token={token}
              />
            )}
          </div>

          {/* 右カラム：注文サマリー */}
          <aside className="order-1 lg:order-2">
            <div className="bg-white border-3 sm:border-4 border-black rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] lg:sticky lg:top-28">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wide mb-4 sm:mb-6 text-black">
                注文内容
              </h2>

              {/* 商品リスト */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 sm:gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 relative bg-gray-100 border-2 sm:border-3 border-black rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image || '/placeholder.jpg'}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 64px, 80px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm sm:text-base line-clamp-2">{item.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        数量: {item.quantity}
                      </p>
                      <p className="font-black text-sm sm:text-base mt-1">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <hr className="border-2 border-black mb-4 sm:mb-6" />

              {/* 金額内訳 */}
              <dl className="space-y-2 sm:space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-600 text-sm sm:text-base">小計</dt>
                  <dd className="font-black text-sm sm:text-base">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600 text-sm sm:text-base">送料</dt>
                  <dd className="font-black text-sm sm:text-base">
                    {shipping === 0 ? (
                      <span className="text-[#7dff3a] bg-black px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm">
                        FREE
                      </span>
                    ) : (
                      formatPrice(shipping)
                    )}
                  </dd>
                </div>
                <hr className="border-2 border-black" />
                <div className="flex justify-between items-baseline">
                  <dt className="font-black text-base sm:text-lg uppercase">合計</dt>
                  <dd className="text-xl sm:text-2xl font-black">{formatPrice(total)}</dd>
                </div>
                <p className="text-xs text-gray-500 text-right">（税込）</p>
              </dl>

              {/* カートに戻る */}
              <Link
                href="/cart"
                className="flex items-center gap-2 mt-4 sm:mt-6 font-bold text-sm sm:text-base text-gray-600 hover:text-black transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                >
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
