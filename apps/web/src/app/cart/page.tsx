import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Cart",
  description: "お買い物カートの中身をご確認ください。",
  robots: {
    index: false,
    follow: false,
  },
};

// モックデータ
const cartItems = [
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

function formatPrice(price: number): string {
  return `¥${price.toLocaleString()}`;
}

export default function CartPage() {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= 5000 ? 0 : 550;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-7xl mx-auto px-4 py-20">
        {/* ページヘッダー */}
        <header className="text-center mb-16" aria-labelledby="page-title">
          <h1 id="page-title" className="text-6xl md:text-7xl font-black mb-4 tracking-wide text-black" style={{ fontFamily: 'var(--font-anton), sans-serif' }}>
            CART
          </h1>
          <p className="text-lg text-gray-600 font-bold uppercase tracking-wider">
            {cartItems.length} {cartItems.length === 1 ? 'ITEM' : 'ITEMS'} IN YOUR BAG
          </p>
        </header>

        {cartItems.length === 0 ? (
          // 空のカート
          <div className="text-center py-16">
            <div className="w-32 h-32 mx-auto mb-8 bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <circle cx="8" cy="21" r="1"/>
                <circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
            </div>
            <h2 className="text-2xl font-black mb-4 uppercase tracking-wide text-black">YOUR CART IS EMPTY</h2>
            <p className="text-gray-600 mb-8">
              まだ商品がカートに入っていません。お買い物を始めましょう！
            </p>
            <Link
              href="/products"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-black uppercase tracking-wider bg-black text-white border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
            >
              START SHOPPING
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* カート商品リスト */}
            <section className="lg:col-span-2 space-y-4" aria-labelledby="cart-items-heading">
              <h2 id="cart-items-heading" className="sr-only">カート内の商品</h2>
              {cartItems.map((item) => (
                <article key={item.id} className="bg-white border-4 border-black rounded-2xl p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex gap-4">
                    {/* 商品画像 */}
                    <Link href={`/products/${item.slug}`} className="flex-shrink-0">
                      <figure className="w-24 h-24 md:w-32 md:h-32 relative bg-gray-100 border-3 border-black rounded-xl overflow-hidden">
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                      </figure>
                    </Link>

                    {/* 商品情報 */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <Link
                          href={`/products/${item.slug}`}
                          className="font-black text-lg hover:text-[#ff2d78] transition-colors line-clamp-2"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xl font-black mt-1">{formatPrice(item.price)}</p>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        {/* 数量 */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="w-10 h-10 bg-white border-3 border-black rounded-lg font-black text-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                            aria-label="数量を減らす"
                          >
                            -
                          </button>
                          <span className="w-12 text-center font-black text-lg">{item.quantity}</span>
                          <button
                            type="button"
                            className="w-10 h-10 bg-white border-3 border-black rounded-lg font-black text-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                            aria-label="数量を増やす"
                          >
                            +
                          </button>
                        </div>

                        {/* 削除ボタン */}
                        <button
                          type="button"
                          className="text-sm font-bold text-[#ff2d78] hover:underline uppercase tracking-wider"
                          aria-label={`${item.name}をカートから削除`}
                        >
                          REMOVE
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 小計 */}
                  <div className="mt-4 pt-4 border-t-2 border-black flex justify-between items-center">
                    <span className="font-bold uppercase tracking-wider text-gray-600">SUBTOTAL</span>
                    <span className="text-xl font-black">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </article>
              ))}

              {/* お買い物を続ける */}
              <Link
                href="/products"
                className="inline-flex items-center gap-2 font-bold text-black hover:text-[#ff2d78] transition-colors uppercase tracking-wider"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                CONTINUE SHOPPING
              </Link>
            </section>

            {/* 注文サマリー */}
            <aside>
              <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sticky top-28">
                <h2 className="text-xl font-black uppercase tracking-wide mb-6 text-black">ORDER SUMMARY</h2>

                <dl className="space-y-4">
                  <div className="flex justify-between">
                    <dt className="text-gray-600 font-medium">Subtotal</dt>
                    <dd className="font-black">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600 font-medium">Shipping</dt>
                    <dd className="font-black">
                      {shipping === 0 ? (
                        <span className="text-[#7dff3a] bg-black px-2 py-1 rounded text-sm">FREE</span>
                      ) : (
                        formatPrice(shipping)
                      )}
                    </dd>
                  </div>
                  {shipping > 0 && (
                    <p className="text-sm text-gray-500 bg-[#7dff3a] border-2 border-black rounded-lg p-3">
                      あと<span className="font-black">{formatPrice(5000 - subtotal)}</span>で送料無料！
                    </p>
                  )}
                  <hr className="border-2 border-black" />
                  <div className="flex justify-between items-baseline">
                    <dt className="font-black text-lg uppercase">Total</dt>
                    <dd className="text-2xl font-black">{formatPrice(total)}</dd>
                  </div>
                  <p className="text-xs text-gray-500 text-right">（税込）</p>
                </dl>

                {/* クーポンコード */}
                <div className="mt-6">
                  <label htmlFor="coupon" className="block font-bold text-sm uppercase tracking-wider mb-2">
                    COUPON CODE
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="coupon"
                      type="text"
                      placeholder="Enter code"
                      className="flex-1 px-4 py-2 bg-white border-3 border-black rounded-lg font-medium text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all"
                    />
                    <button type="button" className="px-4 py-2 bg-white border-3 border-black rounded-lg font-black text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
                      APPLY
                    </button>
                  </div>
                </div>

                {/* 購入手続きボタン */}
                <Link
                  href="/checkout"
                  className="block w-full mt-6 px-8 py-4 text-center text-lg font-black uppercase tracking-wider bg-black text-white border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
                >
                  CHECKOUT
                </Link>

                {/* 安全なお買い物 */}
                <div className="mt-6 pt-6 border-t-2 border-black">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    SECURE CHECKOUT
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    SSL暗号化通信でお客様の情報を保護しています
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
