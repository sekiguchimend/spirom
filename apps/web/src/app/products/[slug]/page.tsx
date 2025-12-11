import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getProductBySlug, getFeaturedProducts } from '@/lib/supabase';
import { AddToCartButton } from '@/components/product';
import { formatPrice } from '@/lib/utils';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}


export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://spirom.com';

  if (!product) {
    return { title: '商品が見つかりません' };
  }

  return {
    title: product.name,
    description: product.description || '',
    alternates: {
      canonical: `${siteUrl}/products/${slug}`,
    },
    openGraph: {
      title: `${product.name} | Spirom`,
      description: product.description || '',
      url: `${siteUrl}/products/${slug}`,
      type: 'website',
      images: product.images[0] ? [{
        url: product.images[0].startsWith('http') ? product.images[0] : `${siteUrl}${product.images[0]}`,
        width: 1200,
        height: 630,
        alt: product.name,
      }] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // 関連商品を取得（同じカテゴリまたはfeatured商品）
  const relatedProducts = await getFeaturedProducts(4);
  const filteredRelated = relatedProducts.filter(p => p.id !== product.id).slice(0, 4);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://spirom.com';
  const inStock = product.stock > 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map(img => img.startsWith('http') ? img : `${siteUrl}${img}`),
    sku: product.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: 'Spirom',
    },
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/products/${product.slug}`,
      priceCurrency: product.currency || 'JPY',
      price: product.price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Spirom',
      },
    },
  };

  const isNew = product.tags.includes('new');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-[#FAFAFA]">
        {/* メインコンテンツ */}
        <article className="grid grid-cols-1 lg:grid-cols-2">
          {/* 左: 画像エリア - フル高さ、スティッキー */}
          <div className="lg:sticky lg:top-0 lg:h-screen bg-[#FAFAFA] flex items-center justify-center p-8 lg:p-16">
            <div className="relative w-full max-w-lg">
              {isNew && (
                <div className="absolute -top-2 -right-2 z-10">
                  <div className="bg-white text-[#323232] text-xs font-black px-3 py-1.5 rounded-full transform rotate-12 shadow-lg border border-[#323232]/10">
                    NEW
                  </div>
                </div>
              )}
              <div className="aspect-square relative">
                {product.images[0] ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="object-contain drop-shadow-2xl"
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                    No Image
                  </div>
                )}
              </div>
              {/* サムネイル */}
              {product.images.length > 1 && (
                <div className="flex justify-center gap-3 mt-8">
                  {product.images.slice(0, 4).map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`w-14 h-14 relative bg-white rounded-lg overflow-hidden transition-all ${index === 0 ? 'ring-2 ring-[#4a7c59] scale-110' : 'opacity-60 hover:opacity-100'}`}
                    >
                      <Image src={image} alt="" fill className="object-contain p-1" sizes="56px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右: 商品情報 - ビンテージグリーン */}
          <div className="px-6 py-12 lg:px-16 lg:py-20 flex flex-col justify-center bg-[#4a7c59] rounded-bl-[80px]">
            <div className="max-w-md">
              {/* ブランド */}
              <p className="text-sm tracking-[0.2em] text-white/70 uppercase mb-4 font-bold">Spirom</p>

              {/* 商品名 */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight mb-6 tracking-tight text-white">
                {product.name}
              </h1>

              {/* 価格 */}
              <div className="flex items-end gap-4 mb-8">
                <span className="text-4xl md:text-5xl font-black text-white">{formatPrice(product.price)}</span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-xl text-white/50 line-through mb-1 font-bold">{formatPrice(product.compare_at_price)}</span>
                )}
              </div>

              {/* 説明 */}
              {product.description && (
                <p className="text-white/85 leading-relaxed mb-10 text-lg font-medium">{product.description}</p>
              )}

              {/* 数量とカートボタン */}
              <AddToCartButton
                productId={product.id}
                slug={product.slug}
                name={product.name}
                price={product.price}
                image={product.images[0] || '/placeholder-product.jpg'}
                stock={product.stock}
              />

              {/* 特典 */}
              <div className="space-y-3 pt-8 border-t border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                  <span className="text-sm text-white font-bold">5,000円以上で送料無料</span>
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
          </div>
        </article>

        {/* 関連商品 */}
        {filteredRelated.length > 0 && (
          <section className="px-6 py-20 lg:px-16 bg-[#FAFAFA]">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <p className="text-xs tracking-[0.2em] text-[#4a7c59] uppercase mb-2 font-bold">You may also like</p>
                  <h2 className="text-3xl md:text-4xl font-black text-[#323232]">More to explore</h2>
                </div>
                <Link href="/products" className="text-sm font-bold text-[#4a7c59] hover:underline underline-offset-4">
                  View all →
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {filteredRelated.map((item) => (
                  <Link key={item.id} href={`/products/${item.slug}`} className="group">
                    <div className="aspect-square relative bg-white rounded-2xl overflow-hidden mb-4 shadow-sm group-hover:shadow-xl transition-shadow duration-300">
                      <Image
                        src={item.images[0] || '/placeholder-product.jpg'}
                        alt={item.name}
                        fill
                        className="object-contain p-6 group-hover:scale-110 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                    <h3 className="font-bold mb-1 text-[#323232] group-hover:text-[#4a7c59] transition-colors">{item.name}</h3>
                    <p className="text-[#323232] font-bold">¥{item.price.toLocaleString()}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
