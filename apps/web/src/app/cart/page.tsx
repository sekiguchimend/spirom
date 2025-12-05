import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "カート",
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
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(price);
}

export default function CartPage() {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= 5000 ? 0 : 550;
  const total = subtotal + shipping;

  return (
    <>
      {/* パンくずリスト */}
      <nav aria-label="パンくずリスト" className="bg-[var(--color-bg-alt)] py-4">
        <div className="max-w-7xl mx-auto px-4">
          <ol className="flex items-center gap-2 text-sm" itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link href="/" itemProp="item" className="text-[var(--color-text-light)] hover:text-[var(--color-primary)]">
                <span itemProp="name">ホーム</span>
              </Link>
              <meta itemProp="position" content="1" />
            </li>
            <li aria-hidden="true" className="text-[var(--color-text-muted)]">/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" className="text-[var(--color-text)]">カート</span>
              <meta itemProp="position" content="2" />
            </li>
          </ol>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-bold heading-display mb-8">
          ショッピングカート
        </h1>

        {cartItems.length === 0 ? (
          // 空のカート
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 text-[var(--color-text-muted)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1"/>
                <circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold heading-display mb-4">カートは空です</h2>
            <p className="text-[var(--color-text-light)] mb-8">
              まだ商品がカートに入っていません。<br />
              お買い物を始めましょう！
            </p>
            <Link href="/products" className="btn btn-primary">
              商品を見る
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* カート商品リスト */}
            <section aria-labelledby="cart-items-heading" className="lg:col-span-2">
              <h2 id="cart-items-heading" className="sr-only">カート内の商品</h2>

              {/* デスクトップ用ヘッダー */}
              <div className="hidden md:grid grid-cols-12 gap-4 pb-4 border-b-2 border-[var(--color-border)] text-sm font-medium text-[var(--color-text-light)]">
                <div className="col-span-6">商品</div>
                <div className="col-span-2 text-center">価格</div>
                <div className="col-span-2 text-center">数量</div>
                <div className="col-span-2 text-right">小計</div>
              </div>

              <ul className="divide-y-2 divide-[var(--color-border)]">
                {cartItems.map((item) => (
                  <li key={item.id} className="py-6">
                    <article className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
                      {/* 商品情報 */}
                      <div className="md:col-span-6 flex gap-4 mb-4 md:mb-0">
                        <Link href={`/products/${item.slug}`} className="flex-shrink-0">
                          <figure className="w-24 h-24 md:w-20 md:h-20 relative card overflow-hidden">
                            <Image
                              src={item.image}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="100px"
                            />
                          </figure>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${item.slug}`}
                            className="font-semibold hover:text-[var(--color-primary)] line-clamp-2"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            className="text-sm text-[var(--color-accent)] hover:underline mt-2"
                            aria-label={`${item.name}をカートから削除`}
                          >
                            削除
                          </button>
                        </div>
                      </div>

                      {/* 価格 */}
                      <div className="md:col-span-2 text-center hidden md:block">
                        <span className="price">{formatPrice(item.price)}</span>
                      </div>

                      {/* 数量 */}
                      <div className="md:col-span-2 flex items-center justify-between md:justify-center mb-4 md:mb-0">
                        <span className="md:hidden text-[var(--color-text-light)]">数量:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="w-8 h-8 rounded-lg border-2 border-[var(--color-border)] flex items-center justify-center hover:border-[var(--color-primary)] transition-colors"
                            aria-label="数量を減らす"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14"/>
                            </svg>
                          </button>
                          <label htmlFor={`quantity-${item.id}`} className="sr-only">
                            {item.name}の数量
                          </label>
                          <input
                            id={`quantity-${item.id}`}
                            type="number"
                            value={item.quantity}
                            min="1"
                            max="99"
                            className="w-12 h-8 text-center border-2 border-[var(--color-border)] rounded-lg font-medium"
                            readOnly
                          />
                          <button
                            type="button"
                            className="w-8 h-8 rounded-lg border-2 border-[var(--color-border)] flex items-center justify-center hover:border-[var(--color-primary)] transition-colors"
                            aria-label="数量を増やす"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14"/><path d="M12 5v14"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* 小計 */}
                      <div className="md:col-span-2 flex items-center justify-between md:justify-end">
                        <span className="md:hidden text-[var(--color-text-light)]">小計:</span>
                        <span className="price text-lg">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>

              {/* お買い物を続ける */}
              <div className="mt-6">
                <Link href="/products" className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:underline">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  お買い物を続ける
                </Link>
              </div>
            </section>

            {/* 注文サマリー */}
            <aside className="lg:col-span-1">
              <div className="card p-6 sticky top-28">
                <h2 className="font-bold text-xl heading-display mb-6">注文サマリー</h2>

                <dl className="space-y-4">
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-text-light)]">小計</dt>
                    <dd className="font-medium">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-text-light)]">送料</dt>
                    <dd className="font-medium">
                      {shipping === 0 ? (
                        <span className="text-green-600">無料</span>
                      ) : (
                        formatPrice(shipping)
                      )}
                    </dd>
                  </div>
                  {shipping > 0 && (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      あと{formatPrice(5000 - subtotal)}で送料無料！
                    </p>
                  )}
                  <hr className="border-[var(--color-border)]" />
                  <div className="flex justify-between items-baseline">
                    <dt className="font-bold text-lg">合計</dt>
                    <dd className="price text-2xl">{formatPrice(total)}</dd>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">（税込）</p>
                </dl>

                {/* クーポンコード */}
                <div className="mt-6">
                  <label htmlFor="coupon" className="block font-medium mb-2 text-sm">
                    クーポンコード
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="coupon"
                      type="text"
                      placeholder="コードを入力"
                      className="input flex-1 py-2 text-sm"
                    />
                    <button type="button" className="btn btn-outline py-2 px-4 text-sm">
                      適用
                    </button>
                  </div>
                </div>

                {/* 購入手続きボタン */}
                <Link
                  href="/checkout"
                  className="btn btn-primary w-full mt-6"
                >
                  購入手続きへ
                </Link>

                {/* 安全なお買い物 */}
                <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-light)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    安全なお買い物
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    SSL暗号化通信でお客様の情報を保護しています
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
