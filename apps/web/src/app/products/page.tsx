import type { Metadata } from 'next';
import { ProductCard, CategoryPill } from '@/components/ui';
import { getAllProducts, getProductsByCategory, getTopLevelCategories } from '@/lib/supabase';

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

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}

// タグを判定するヘルパー関数
function getProductTag(tags: string[]): 'NEW' | 'SALE' | 'HOT' | undefined {
  if (tags.includes('new')) return 'NEW';
  if (tags.includes('sale')) return 'SALE';
  if (tags.includes('hot')) return 'HOT';
  return undefined;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const selectedCategory = params.category || 'all';

  // データ取得
  const [products, categories] = await Promise.all([
    selectedCategory === 'all'
      ? getAllProducts()
      : getProductsByCategory(selectedCategory),
    getTopLevelCategories(12),
  ]);

  // カテゴリリストに「All」を追加
  const categoryList = [
    { slug: 'all', name: 'All' },
    ...categories.map(c => ({ slug: c.slug, name: c.name })),
  ];

  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-32 pb-8 sm:pt-28 sm:pb-20">
        {/* ページヘッダー */}
        <header className="text-center mb-8 sm:mb-16" aria-labelledby="page-title">
          <h1 id="page-title" className="text-4xl sm:text-6xl md:text-7xl font-black mb-2 sm:mb-4 tracking-wide text-black" style={{ fontFamily: 'var(--font-anton), sans-serif' }}>
            PRODUCTS
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 font-bold uppercase tracking-wider">
            {products.length} ITEMS AVAILABLE
          </p>
        </header>

        {/* カテゴリフィルター */}
        <nav aria-label="カテゴリフィルター" className="mb-12">
          <ul className="flex flex-wrap justify-center [&>li:last-child_a]:after:hidden">
            {categoryList.map((category) => (
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
          {products.length > 0 ? (
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard
                    slug={product.slug}
                    name={product.name}
                    price={product.price}
                    image={product.images[0] || '/placeholder-product.jpg'}
                    tag={getProductTag(product.tags)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">商品が見つかりませんでした</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
