import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// モックデータ
const productData = {
  'organic-cotton-tote': {
    id: '1',
    slug: 'organic-cotton-tote',
    name: 'オーガニックコットントート',
    description: 'GOTS認証を受けたオーガニックコットン100%使用。シンプルながら丈夫で、毎日のお買い物からお出かけまで幅広くお使いいただけます。内ポケット付きで小物の整理にも便利。',
    price: 3800,
    images: ['/products/tote.jpg', '/products/tote-2.jpg', '/products/tote-3.jpg'],
    category: 'バッグ',
    categorySlug: 'bags',
    isNew: true,
    inStock: true,
    features: [
      'GOTS認証オーガニックコットン100%',
      '内ポケット付き',
      '洗濯機使用可（ネット使用）',
      'サイズ: W35 × H38 × D10 cm',
      '持ち手の長さ: 60cm',
    ],
    specifications: [
      { label: '素材', value: 'オーガニックコットン100%' },
      { label: 'サイズ', value: 'W35 × H38 × D10 cm' },
      { label: '重量', value: '約280g' },
      { label: '生産国', value: '日本' },
      { label: '洗濯', value: '洗濯機可（ネット使用）' },
    ],
  },
};

const relatedProducts = [
  { id: '5', slug: 'canvas-backpack', name: 'キャンバスバックパック', price: 8900, image: '/products/backpack.jpg', category: 'バッグ' },
  { id: '3', slug: 'linen-cushion', name: 'リネンクッションカバー', price: 2800, image: '/products/cushion.jpg', category: 'インテリア' },
  { id: '6', slug: 'bamboo-utensil-set', name: '竹カトラリーセット', price: 2200, image: '/products/utensil.jpg', category: 'キッチン' },
  { id: '8', slug: 'leather-wallet', name: '本革コンパクトウォレット', price: 9800, image: '/products/wallet.jpg', category: 'ファッション' },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(price);
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = productData[slug as keyof typeof productData];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://spirom.com';

  if (!product) {
    return { title: '商品が見つかりません' };
  }

  return {
    title: product.name,
    description: product.description,
    alternates: {
      canonical: `${siteUrl}/products/${slug}`,
    },
    openGraph: {
      title: `${product.name} | Spirom`,
      description: product.description,
      url: `${siteUrl}/products/${slug}`,
      type: 'website',
      images: [{
        url: `${siteUrl}${product.images[0]}`,
        width: 1200,
        height: 630,
        alt: product.name,
      }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = productData[slug as keyof typeof productData];

  if (!product) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://spirom.com';

  // モックレビューデータ（実際はAPIから取得）
  const reviewStats = {
    averageRating: 4.5,
    reviewCount: 24,
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map(img => `${siteUrl}${img}`),
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: 'Spirom',
    },
    aggregateRating: reviewStats.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: reviewStats.averageRating,
      reviewCount: reviewStats.reviewCount,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/products/${product.slug}`,
      priceCurrency: 'JPY',
      price: product.price,
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Spirom',
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* パンくずリスト */}
      <nav aria-label="パンくずリスト" className="bg-[var(--color-bg-alt)] py-4">
        <div className="max-w-7xl mx-auto px-4">
          <ol className="flex items-center gap-2 text-sm flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link href="/" itemProp="item" className="text-[var(--color-text-light)] hover:text-[var(--color-primary)]">
                <span itemProp="name">ホーム</span>
              </Link>
              <meta itemProp="position" content="1" />
            </li>
            <li aria-hidden="true" className="text-[var(--color-text-muted)]">/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link href="/products" itemProp="item" className="text-[var(--color-text-light)] hover:text-[var(--color-primary)]">
                <span itemProp="name">商品一覧</span>
              </Link>
              <meta itemProp="position" content="2" />
            </li>
            <li aria-hidden="true" className="text-[var(--color-text-muted)]">/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link href={`/categories/${product.categorySlug}`} itemProp="item" className="text-[var(--color-text-light)] hover:text-[var(--color-primary)]">
                <span itemProp="name">{product.category}</span>
              </Link>
              <meta itemProp="position" content="3" />
            </li>
            <li aria-hidden="true" className="text-[var(--color-text-muted)]">/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" className="text-[var(--color-text)]">{product.name}</span>
              <meta itemProp="position" content="4" />
            </li>
          </ol>
        </div>
      </nav>

      <article className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* 商品画像 */}
          <section aria-labelledby="product-images-heading">
            <h2 id="product-images-heading" className="sr-only">商品画像</h2>
            <div className="space-y-4">
              {/* メイン画像 */}
              <figure className="card overflow-hidden">
                <div className="aspect-square relative bg-[var(--color-bg-alt)]">
                  {product.isNew && (
                    <span className="absolute top-4 left-4 z-10 tag tag-accent text-white border-none">
                      NEW
                    </span>
                  )}
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </figure>
              {/* サムネイル */}
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`card overflow-hidden aspect-square relative ${index === 0 ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
                    aria-label={`商品画像${index + 1}を表示`}
                    aria-pressed={index === 0}
                  >
                    <Image
                      src={image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="100px"
                    />
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 商品情報 */}
          <section aria-labelledby="product-info-heading">
            <h2 id="product-info-heading" className="sr-only">商品情報</h2>
            <div className="space-y-6">
              {/* カテゴリ・商品名 */}
              <div>
                <Link
                  href={`/categories/${product.categorySlug}`}
                  className="tag tag-primary mb-3 inline-block"
                >
                  {product.category}
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold heading-display">
                  {product.name}
                </h1>
              </div>

              {/* 価格 */}
              <div className="flex items-baseline gap-3">
                <span className="price text-3xl">{formatPrice(product.price)}</span>
                <span className="text-sm text-[var(--color-text-muted)]">（税込）</span>
              </div>

              {/* 在庫状況 */}
              <div className="flex items-center gap-2">
                {product.inStock ? (
                  <>
                    <span className="w-3 h-3 bg-green-500 rounded-full" aria-hidden="true" />
                    <span className="text-green-600 font-medium">在庫あり</span>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 bg-red-500 rounded-full" aria-hidden="true" />
                    <span className="text-red-600 font-medium">在庫なし</span>
                  </>
                )}
              </div>

              {/* 説明文 */}
              <p className="text-[var(--color-text-light)] leading-relaxed">
                {product.description}
              </p>

              {/* 特徴リスト */}
              <div>
                <h3 className="font-bold text-lg heading-display mb-3">特徴</h3>
                <ul className="space-y-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 数量選択とカートに追加 */}
              <form className="space-y-4">
                <div>
                  <label htmlFor="quantity" className="block font-medium mb-2">
                    数量
                  </label>
                  <select
                    id="quantity"
                    className="input w-24"
                    defaultValue="1"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={!product.inStock}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="21" r="1"/>
                      <circle cx="19" cy="21" r="1"/>
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                    </svg>
                    カートに追加
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    aria-label="お気に入りに追加"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                  </button>
                </div>
              </form>

              {/* 配送情報 */}
              <div className="card p-4 bg-[var(--color-bg-alt)]">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16v-2"/>
                    <path d="m7.5 4.27 9 5.15"/>
                    <polyline points="3.29 7 12 12 20.71 7"/>
                    <line x1="12" y1="22" x2="12" y2="12"/>
                  </svg>
                  <div>
                    <p className="font-medium">送料無料</p>
                    <p className="text-sm text-[var(--color-text-light)]">¥5,000以上のお買い上げで送料無料</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 商品仕様 */}
        <section aria-labelledby="specs-heading" className="mt-12 md:mt-16">
          <h2 id="specs-heading" className="text-2xl font-bold heading-display heading-decorated mb-8">
            商品仕様
          </h2>
          <div className="card overflow-hidden">
            <dl>
              {product.specifications.map((spec, index) => (
                <div
                  key={spec.label}
                  className={`flex py-4 px-6 ${index % 2 === 0 ? 'bg-[var(--color-bg-alt)]' : ''}`}
                >
                  <dt className="w-1/3 font-medium text-[var(--color-text-light)]">{spec.label}</dt>
                  <dd className="w-2/3">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* 関連商品 */}
        <section aria-labelledby="related-heading" className="mt-12 md:mt-16">
          <header className="flex items-end justify-between mb-8">
            <h2 id="related-heading" className="text-2xl font-bold heading-display heading-decorated">
              関連商品
            </h2>
            <Link href="/products" className="btn btn-outline text-sm">
              もっと見る
            </Link>
          </header>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map((item) => (
              <li key={item.id}>
                <article className="card product-card">
                  <Link href={`/products/${item.slug}`} className="block">
                    <figure className="product-image relative">
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                      />
                    </figure>
                    <div className="p-3 md:p-4">
                      <p className="tag text-xs mb-1">{item.category}</p>
                      <h3 className="font-medium text-sm md:text-base line-clamp-2 mb-1">
                        {item.name}
                      </h3>
                      <p className="price">{formatPrice(item.price)}</p>
                    </div>
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </>
  );
}
