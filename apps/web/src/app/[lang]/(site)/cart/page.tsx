'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCart, refreshCart, removeFromCart, updateCartQuantity, clearCart, type CartItem } from '@/lib/cart';
import { formatPrice } from '@/lib/utils';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';

export default function CartPage() {
  const pathname = usePathname();
  const langFromPath = pathname.split('/')[1] as Locale;
  const locale = langFromPath || defaultLocale;
  const routes = createLocalizedRoutes(locale);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void refreshCart()
      .then(() => setCart(getCart()))
      .catch(() => setCart(getCart()))
      .finally(() => setIsLoaded(true));

    const handleCartUpdate = () => {
      setCart(getCart());
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      void removeFromCart(productId);
    } else {
      void updateCartQuantity(productId, newQuantity);
    }
  };

  const handleRemove = (productId: string) => {
    void removeFromCart(productId);
  };

  const handleClearCart = () => {
    void clearCart();
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 750;
  const total = subtotal + shipping;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-[#323232] font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-10">
      {/* SEO用h1（視覚的に非表示） */}
      <h1 className="sr-only">ショッピングカート - Spirom</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* 左: カート内容 */}
        <section className="px-6 py-12 lg:px-16 lg:py-20 pt-32 lg:pt-32 pb-20 lg:pb-32" aria-labelledby="cart-items-heading">
          <h2 id="cart-items-heading" className="sr-only">カート内の商品</h2>
          <div className="max-w-lg mx-auto lg:mx-0">

            {cart.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-[#323232]/5 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#323232"
                    strokeWidth="1.5"
                  >
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <p className="text-[#323232]/70 font-bold mb-6">カートは空です</p>
                <Link
                  href={routes.PRODUCTS.INDEX}
                  className="inline-block px-8 py-4 bg-[#323232] text-white font-bold text-sm tracking-wider rounded-full hover:bg-[#323232]/90 transition-colors"
                >
                  SHOP NOW
                </Link>
              </div>
            ) : (
              <>
                {/* 商品リスト */}
                <ul className="space-y-6 mb-8">
                  {cart.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm"
                    >
                      {/* 商品画像 */}
                      <Link href={routes.PRODUCTS.DETAIL(item.slug)} className="flex-shrink-0">
                        <div className="w-24 h-24 relative bg-[#FAFAFA] rounded-xl overflow-hidden">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-contain p-2"
                            sizes="96px"
                          />
                        </div>
                      </Link>

                      {/* 商品情報 */}
                      <div className="flex-1 min-w-0">
                        <Link href={routes.PRODUCTS.DETAIL(item.slug)}>
                          <h3 className="font-bold text-[#323232] truncate hover:text-[#4a7c59] transition-colors">
                            {item.name}
                          </h3>
                        </Link>
                        <p className="text-[#4a7c59] font-bold mt-1">
                          {formatPrice(item.price)}
                        </p>

                        {/* 数量調整 */}
                        <div className="flex items-center gap-3 mt-3">
                          <div className="inline-flex items-center bg-[#FAFAFA] rounded-full">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                              className="w-8 h-8 text-sm font-bold text-[#323232] hover:bg-[#323232]/10 rounded-full transition-colors"
                            >
                              −
                            </button>
                            <span className="w-8 text-center font-bold text-sm text-[#323232]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                              className="w-8 h-8 text-sm font-bold text-[#323232] hover:bg-[#323232]/10 rounded-full transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemove(item.productId)}
                            className="text-xs text-[#323232]/50 hover:text-red-500 font-bold transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </div>

                      {/* 小計 */}
                      <div className="text-right">
                        <p className="font-black text-[#323232]">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* カートクリア */}
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-sm text-[#323232]/50 hover:text-red-500 font-bold transition-colors"
                >
                  カートを空にする
                </button>
              </>
            )}
          </div>
        </section>

        {/* 右: 見積書サマリー */}
        <section className="px-6 py-12 lg:px-16 lg:py-20 flex flex-col justify-center bg-[#4a7c59] lg:rounded-bl-[80px]" aria-labelledby="order-summary-heading">
          <div className="max-w-md mx-auto lg:mx-0 w-full">
            <p className="text-sm tracking-[0.2em] text-white/70 uppercase mb-4 font-bold">Order Summary</p>
            <h2 id="order-summary-heading" className="text-3xl md:text-4xl font-black leading-tight mb-8 tracking-tight text-white">
              見積書
            </h2>

            {/* 明細 */}
            <div className="space-y-4 mb-8 pb-8 border-b border-white/20">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-white/85">
                  <span className="font-medium">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* 小計・送料・合計 */}
            <div className="space-y-4 mb-10">
              <div className="flex justify-between text-white/85">
                <span className="font-medium">小計</span>
                <span className="font-bold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-white/85">
                <span className="font-medium">送料</span>
                <span className="font-bold">{formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between text-white pt-4 border-t border-white/20">
                <span className="text-xl font-black">合計</span>
                <span className="text-3xl font-black">{formatPrice(total)}</span>
              </div>
            </div>

            {/* チェックアウトボタン */}
            {cart.length > 0 && (
              <>
                <Link
                  href={routes.CHECKOUT.INDEX}
                  className="block w-full py-5 bg-white text-[#4a7c59] font-bold text-sm tracking-wider rounded-full hover:bg-white/90 transition-all duration-300 text-center"
                >
                  CHECKOUT
                </Link>
                <Link
                  href={`${routes.ACCOUNT.NEW_ADDRESS}?redirect=${encodeURIComponent(routes.CHECKOUT.INDEX)}`}
                  className="block w-full py-3 mt-3 text-white/80 font-bold text-xs tracking-wider text-center hover:text-white transition-colors"
                >
                  配送先住所を登録
                </Link>
              </>
            )}

            {/* 買い物を続ける */}
            <Link
              href={routes.PRODUCTS.INDEX}
              className="block w-full py-4 mt-4 text-white font-bold text-sm tracking-wider text-center hover:text-white/80 transition-colors"
            >
              ← 買い物を続ける
            </Link>

            {/* 特典 */}
            <div className="space-y-3 pt-8 mt-8 border-t border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
                <span className="text-sm text-white font-bold">送料 全国一律750円</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                  </svg>
                </div>
                <span className="text-sm text-white font-bold">14日間返品可能</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
