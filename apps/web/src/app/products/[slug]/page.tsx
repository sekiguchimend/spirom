import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/ui';

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
    category: 'BAGS',
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
      { label: 'Material', value: 'オーガニックコットン100%' },
      { label: 'Size', value: 'W35 × H38 × D10 cm' },
      { label: 'Weight', value: '約280g' },
      { label: 'Made in', value: 'Japan' },
      { label: 'Care', value: '洗濯機可（ネット使用）' },
    ],
  },
};

const relatedProducts = [
  { id: '5', slug: 'canvas-backpack', name: 'キャンバスバックパック', price: 8900, image: '/products/backpack.jpg' },
  { id: '3', slug: 'linen-cushion', name: 'リネンクッションカバー', price: 2800, image: '/products/cushion.jpg', tag: 'NEW' as const },
  { id: '6', slug: 'bamboo-utensil-set', name: '竹カトラリーセット', price: 2200, image: '/products/utensil.jpg', tag: 'HOT' as const },
  { id: '8', slug: 'leather-wallet', name: '本革コンパクトウォレット', price: 9800, image: '/products/wallet.jpg' },
];

function formatPrice(price: number): string {
  return `¥${price.toLocaleString()}`;
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

      <div className="min-h-screen bg-[#FFFFF5]">
        <article className="max-w-7xl mx-auto px-4 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* 商品画像 */}
            <section aria-labelledby="product-images-heading">
              <h2 id="product-images-heading" className="sr-only">商品画像</h2>
              <div className="space-y-4">
                {/* メイン画像 */}
                <figure className="bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="aspect-square relative bg-gray-50">
                    {product.isNew && (
                      <span className="absolute top-4 left-4 z-10 px-4 py-2 text-sm font-black uppercase tracking-wider bg-[#7dff3a] text-black border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
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
                      className={`bg-white border-3 border-black rounded-xl overflow-hidden aspect-square relative shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all ${index === 0 ? 'ring-2 ring-[#ff2d78] ring-offset-2' : ''}`}
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
                    className="inline-block px-4 py-1.5 text-xs font-black uppercase tracking-wider bg-[#00d4ff] text-black border-3 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all mb-4"
                  >
                    {product.category}
                  </Link>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                    {product.name}
                  </h1>
                </div>

                {/* 価格 */}
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black">{formatPrice(product.price)}</span>
                  <span className="text-sm text-gray-500 font-bold">（税込）</span>
                </div>

                {/* 在庫状況 */}
                <div className="flex items-center gap-2">
                  {product.inStock ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#7dff3a] text-black font-black text-sm border-3 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <span className="w-2 h-2 bg-black rounded-full" aria-hidden="true" />
                      IN STOCK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff2d78] text-white font-black text-sm border-3 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <span className="w-2 h-2 bg-white rounded-full" aria-hidden="true" />
                      OUT OF STOCK
                    </span>
                  )}
                </div>

                {/* 説明文 */}
                <p className="text-gray-700 leading-relaxed">
                  {product.description}
                </p>

                {/* 特徴リスト */}
                <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                  <h3 className="font-black text-lg uppercase tracking-tight mb-4">FEATURES</h3>
                  <ul className="space-y-3">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-[#7dff3a] border-2 border-black rounded flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5"/>
                          </svg>
                        </span>
                        <span className="text-sm font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 数量選択とカートに追加 */}
                <form className="space-y-4">
                  <div>
                    <label htmlFor="quantity" className="block font-black text-sm uppercase tracking-wider mb-2">
                      QUANTITY
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="w-12 h-12 bg-white border-3 border-black rounded-lg font-black text-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                      >
                        -
                      </button>
                      <input
                        id="quantity"
                        type="number"
                        defaultValue="1"
                        min="1"
                        className="w-20 h-12 text-center font-black text-lg bg-white border-3 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      />
                      <button
                        type="button"
                        className="w-12 h-12 bg-white border-3 border-black rounded-lg font-black text-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="submit"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-black uppercase tracking-wider bg-black text-white border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!product.inStock}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="21" r="1"/>
                        <circle cx="19" cy="21" r="1"/>
                        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                      </svg>
                      ADD TO CART
                    </button>
                    <button
                      type="button"
                      className="w-14 h-14 sm:w-auto sm:h-auto sm:px-4 bg-white border-4 border-black rounded-xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(255,45,120,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                      aria-label="お気に入りに追加"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                      </svg>
                    </button>
                  </div>
                </form>

                {/* 配送情報 */}
                <div className="bg-[#7dff3a] border-4 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16v-2"/>
                      <path d="m7.5 4.27 9 5.15"/>
                      <polyline points="3.29 7 12 12 20.71 7"/>
                      <line x1="12" y1="22" x2="12" y2="12"/>
                    </svg>
                    <div>
                      <p className="font-black uppercase tracking-wider">FREE SHIPPING</p>
                      <p className="text-sm font-medium">¥5,000以上のお買い上げで送料無料</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* 商品仕様 */}
          <section aria-labelledby="specs-heading" className="mt-16 md:mt-20">
            <h2 id="specs-heading" className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-8" style={{ fontFamily: 'var(--font-anton), sans-serif' }}>
              SPECIFICATIONS
            </h2>
            <div className="bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <dl>
                {product.specifications.map((spec, index) => (
                  <div
                    key={spec.label}
                    className={`flex py-4 px-6 ${index % 2 === 0 ? 'bg-gray-50' : ''} ${index !== product.specifications.length - 1 ? 'border-b-2 border-black' : ''}`}
                  >
                    <dt className="w-1/3 font-black uppercase tracking-wider text-gray-600">{spec.label}</dt>
                    <dd className="w-2/3 font-medium">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* 関連商品 */}
          <section aria-labelledby="related-heading" className="mt-16 md:mt-20">
            <header className="flex items-end justify-between mb-8">
              <h2 id="related-heading" className="text-3xl md:text-4xl font-black uppercase tracking-tight" style={{ fontFamily: 'var(--font-anton), sans-serif' }}>
                YOU MAY ALSO LIKE
              </h2>
              <Link
                href="/products"
                className="hidden md:inline-flex items-center gap-2 px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
              >
                VIEW ALL
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </Link>
            </header>
            <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((item) => (
                <li key={item.id}>
                  <ProductCard
                    slug={item.slug}
                    name={item.name}
                    price={item.price}
                    image={item.image}
                    tag={item.tag}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-8 text-center md:hidden">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
              >
                VIEW ALL PRODUCTS
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </Link>
            </div>
          </section>
        </article>
      </div>
    </>
  );
}
