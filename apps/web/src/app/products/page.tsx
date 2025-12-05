import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "商品一覧",
  description: "Spiromの商品一覧ページです。こだわりのライフスタイル商品を多数取り揃えています。",
  openGraph: {
    title: "商品一覧 | Spirom",
    description: "こだわりのライフスタイル商品を多数取り揃えています。",
  },
};

// モックデータ
const products = [
  { id: '1', slug: 'organic-cotton-tote', name: 'オーガニックコットントート', price: 3800, image: '/products/tote.jpg', category: 'バッグ', categorySlug: 'bags', isNew: true, isSale: false },
  { id: '2', slug: 'ceramic-mug-set', name: 'セラミックマグセット', price: 4200, image: '/products/mug.jpg', category: 'キッチン', categorySlug: 'kitchen', isNew: false, isSale: false },
  { id: '3', slug: 'linen-cushion', name: 'リネンクッションカバー', price: 2800, image: '/products/cushion.jpg', category: 'インテリア', categorySlug: 'interior', isNew: true, isSale: false },
  { id: '4', slug: 'wooden-coaster', name: '天然木コースター 4枚組', price: 1800, image: '/products/coaster.jpg', category: 'キッチン', categorySlug: 'kitchen', isNew: false, isSale: true, originalPrice: 2400 },
  { id: '5', slug: 'canvas-backpack', name: 'キャンバスバックパック', price: 8900, image: '/products/backpack.jpg', category: 'バッグ', categorySlug: 'bags', isNew: false, isSale: false },
  { id: '6', slug: 'bamboo-utensil-set', name: '竹カトラリーセット', price: 2200, image: '/products/utensil.jpg', category: 'キッチン', categorySlug: 'kitchen', isNew: true, isSale: false },
  { id: '7', slug: 'wool-throw-blanket', name: 'ウールスローブランケット', price: 12800, image: '/products/blanket.jpg', category: 'インテリア', categorySlug: 'interior', isNew: false, isSale: true, originalPrice: 16000 },
  { id: '8', slug: 'leather-wallet', name: '本革コンパクトウォレット', price: 9800, image: '/products/wallet.jpg', category: 'ファッション', categorySlug: 'fashion', isNew: false, isSale: false },
];

const categories = [
  { slug: 'all', name: 'すべて' },
  { slug: 'kitchen', name: 'キッチン' },
  { slug: 'interior', name: 'インテリア' },
  { slug: 'fashion', name: 'ファッション' },
  { slug: 'bags', name: 'バッグ' },
];

const sortOptions = [
  { value: 'newest', label: '新着順' },
  { value: 'price-asc', label: '価格が安い順' },
  { value: 'price-desc', label: '価格が高い順' },
  { value: 'popular', label: '人気順' },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(price);
}

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const selectedCategory = params.category || 'all';
  const selectedSort = params.sort || 'newest';
  const currentPage = parseInt(params.page || '1', 10);

  // フィルタリング（実際はBFFで処理）
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.categorySlug === selectedCategory);

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
              <span itemProp="name" className="text-[var(--color-text)]">商品一覧</span>
              <meta itemProp="position" content="2" />
            </li>
          </ol>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* ページヘッダー */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold heading-display mb-4">
            商品一覧
          </h1>
          <p className="text-[var(--color-text-light)]">
            全{filteredProducts.length}件の商品
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* サイドバー（フィルター） */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="card p-6 sticky top-28">
              <h2 className="font-bold text-lg heading-display mb-4">カテゴリ</h2>
              <nav aria-label="カテゴリフィルター">
                <ul className="space-y-2">
                  {categories.map((category) => (
                    <li key={category.slug}>
                      <Link
                        href={`/products${category.slug === 'all' ? '' : `?category=${category.slug}`}`}
                        className={`block py-2 px-3 rounded-xl transition-colors ${
                          selectedCategory === category.slug
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'hover:bg-[var(--color-bg-alt)]'
                        }`}
                        aria-current={selectedCategory === category.slug ? 'page' : undefined}
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <hr className="my-6 border-[var(--color-border)]" />

              <h2 className="font-bold text-lg heading-display mb-4">価格帯</h2>
              <fieldset>
                <legend className="sr-only">価格帯で絞り込む</legend>
                <ul className="space-y-2">
                  <li>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded border-2 border-[var(--color-border)] text-[var(--color-primary)]" />
                      <span>〜¥3,000</span>
                    </label>
                  </li>
                  <li>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded border-2 border-[var(--color-border)] text-[var(--color-primary)]" />
                      <span>¥3,000〜¥5,000</span>
                    </label>
                  </li>
                  <li>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded border-2 border-[var(--color-border)] text-[var(--color-primary)]" />
                      <span>¥5,000〜¥10,000</span>
                    </label>
                  </li>
                  <li>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded border-2 border-[var(--color-border)] text-[var(--color-primary)]" />
                      <span>¥10,000〜</span>
                    </label>
                  </li>
                </ul>
              </fieldset>
            </div>
          </aside>

          {/* メインコンテンツ */}
          <div className="flex-1">
            {/* ソートコントロール */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <p className="text-[var(--color-text-light)]">
                {filteredProducts.length}件中 1-{Math.min(filteredProducts.length, 12)}件を表示
              </p>
              <div className="flex items-center gap-3">
                <label htmlFor="sort-select" className="text-sm text-[var(--color-text-light)]">
                  並び替え:
                </label>
                <select
                  id="sort-select"
                  className="input py-2 pr-10"
                  defaultValue={selectedSort}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 商品グリッド */}
            <section aria-labelledby="products-heading">
              <h2 id="products-heading" className="sr-only">商品一覧</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <li key={product.id}>
                    <article
                      className="card product-card h-full"
                      itemScope
                      itemType="https://schema.org/Product"
                    >
                      <Link href={`/products/${product.slug}`} className="block h-full">
                        <figure className="product-image relative">
                          {product.isNew && (
                            <span className="product-badge">NEW</span>
                          )}
                          {product.isSale && (
                            <span className="product-badge bg-[var(--color-secondary)] text-[var(--color-text)]">SALE</span>
                          )}
                          <Image
                            src={product.image}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="object-cover"
                            itemProp="image"
                          />
                        </figure>
                        <div className="p-4">
                          <p className="tag text-xs mb-2">{product.category}</p>
                          <h3
                            className="font-semibold text-[var(--color-text)] mb-2 line-clamp-2"
                            itemProp="name"
                          >
                            {product.name}
                          </h3>
                          <div
                            className="flex items-center gap-2"
                            itemProp="offers"
                            itemScope
                            itemType="https://schema.org/Offer"
                          >
                            <meta itemProp="priceCurrency" content="JPY" />
                            <span className="price text-lg" itemProp="price" content={product.price.toString()}>
                              {formatPrice(product.price)}
                            </span>
                            {product.isSale && product.originalPrice && (
                              <span className="price-original text-sm">
                                {formatPrice(product.originalPrice)}
                              </span>
                            )}
                            <link itemProp="availability" href="https://schema.org/InStock" />
                          </div>
                        </div>
                      </Link>
                    </article>
                  </li>
                ))}
              </ul>
            </section>

            {/* ページネーション */}
            <nav aria-label="ページネーション" className="mt-12">
              <ul className="flex items-center justify-center gap-2">
                <li>
                  <Link
                    href="/products?page=1"
                    className="btn btn-outline px-4 py-2 opacity-50 pointer-events-none"
                    aria-disabled="true"
                    tabIndex={-1}
                  >
                    <span className="sr-only">前のページ</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6"/>
                    </svg>
                  </Link>
                </li>
                {[1, 2, 3].map((page) => (
                  <li key={page}>
                    <Link
                      href={`/products?page=${page}`}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl font-semibold transition-colors ${
                        currentPage === page
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'hover:bg-[var(--color-bg-alt)]'
                      }`}
                      aria-current={currentPage === page ? 'page' : undefined}
                    >
                      {page}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/products?page=2"
                    className="btn btn-outline px-4 py-2"
                  >
                    <span className="sr-only">次のページ</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
