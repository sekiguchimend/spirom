import type { Metadata } from 'next';
import { ProductCard, CategoryPill } from '@/components/ui';

export const metadata: Metadata = {
  title: "Products",
  description: "Spiromの商品一覧。大人もきれるカートゥーンをコンセプトにした、遊び心と洗練を融合したファッションアイテム。",
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: "Products | Spirom",
    description: "大人もきれるカートゥーンファッションアイテムを多数取り揃えています。",
  },
};

// モックデータ
const products = [
  { id: '1', slug: 'organic-cotton-tote', name: 'オーガニックコットントート', price: 3800, image: '/products/tote.jpg', category: 'バッグ', categorySlug: 'bags', tag: 'NEW' as const },
  { id: '2', slug: 'ceramic-mug-set', name: 'セラミックマグセット', price: 4200, image: '/products/mug.jpg', category: 'キッチン', categorySlug: 'kitchen' },
  { id: '3', slug: 'linen-cushion', name: 'リネンクッションカバー', price: 2800, image: '/products/cushion.jpg', category: 'インテリア', categorySlug: 'interior', tag: 'NEW' as const },
  { id: '4', slug: 'wooden-coaster', name: '天然木コースター 4枚組', price: 1800, image: '/products/coaster.jpg', category: 'キッチン', categorySlug: 'kitchen', tag: 'SALE' as const },
  { id: '5', slug: 'canvas-backpack', name: 'キャンバスバックパック', price: 8900, image: '/products/backpack.jpg', category: 'バッグ', categorySlug: 'bags' },
  { id: '6', slug: 'bamboo-utensil-set', name: '竹カトラリーセット', price: 2200, image: '/products/utensil.jpg', category: 'キッチン', categorySlug: 'kitchen', tag: 'HOT' as const },
  { id: '7', slug: 'wool-throw-blanket', name: 'ウールスローブランケット', price: 12800, image: '/products/blanket.jpg', category: 'インテリア', categorySlug: 'interior', tag: 'SALE' as const },
  { id: '8', slug: 'leather-wallet', name: '本革コンパクトウォレット', price: 9800, image: '/products/wallet.jpg', category: 'ファッション', categorySlug: 'fashion' },
];

const categories = [
  { slug: 'all', name: 'All' },
  { slug: 'kitchen', name: 'Kitchen' },
  { slug: 'interior', name: 'Interior' },
  { slug: 'fashion', name: 'Fashion' },
  { slug: 'bags', name: 'Bags' },
];

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const selectedCategory = params.category || 'all';

  // フィルタリング
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.categorySlug === selectedCategory);

  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-7xl mx-auto px-4 py-20">
        {/* ページヘッダー */}
        <header className="text-center mb-16" aria-labelledby="page-title">
          <h1 id="page-title" className="text-6xl md:text-7xl font-black mb-4 tracking-wide text-black" style={{ fontFamily: 'var(--font-anton), sans-serif' }}>
            PRODUCTS
          </h1>
          <p className="text-lg text-gray-600 font-bold uppercase tracking-wider">
            {filteredProducts.length} ITEMS AVAILABLE
          </p>
        </header>

        {/* カテゴリフィルター */}
        <nav aria-label="カテゴリフィルター" className="mb-12">
          <ul className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <li key={category.slug}>
                <CategoryPill
                  href={category.slug === 'all' ? '/products' : `/products?category=${category.slug}`}
                  isActive={selectedCategory === category.slug}
                >
                  {category.name}
                </CategoryPill>
              </li>
            ))}
          </ul>
        </nav>

        {/* 商品グリッド */}
        <section aria-labelledby="products-heading">
          <h2 id="products-heading" className="sr-only">商品一覧</h2>
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <li key={product.id}>
                <ProductCard
                  slug={product.slug}
                  name={product.name}
                  price={product.price}
                  image={product.image}
                  tag={product.tag}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* ページネーション */}
        <nav aria-label="ページネーション" className="mt-16 flex justify-center gap-3">
          <button className="px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] opacity-50 cursor-not-allowed">
            PREV
          </button>
          <button className="w-12 h-12 font-black bg-black text-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            1
          </button>
          <button className="w-12 h-12 font-black bg-white text-black border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200">
            2
          </button>
          <button className="px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200">
            NEXT
          </button>
        </nav>
      </div>
    </div>
  );
}
