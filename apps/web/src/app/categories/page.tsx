import Link from 'next/link';
import type { Metadata } from 'next';
import { getTopLevelCategories } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Spiromの商品カテゴリー一覧。トップス、ボトムス、アウター、アクセサリーなど、大人もきれるカートゥーンファッションをカテゴリーから探せます。',
  alternates: {
    canonical: '/categories',
  },
};

export default async function CategoriesPage() {
  const categories = await getTopLevelCategories(48);
  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-32 pb-8 sm:pt-28 sm:pb-20">
        {/* ページヘッダー */}
        <header className="text-center mb-8 sm:mb-16">
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black mb-2 sm:mb-4 tracking-wide text-black"
            style={{ fontFamily: 'var(--font-anton), sans-serif' }}
          >
            CATEGORIES
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 font-bold uppercase tracking-wider">
            商品カテゴリー
          </p>
        </header>

        {/* カテゴリーグリッド */}
        <section aria-labelledby="categories-list-heading">
          <h2 id="categories-list-heading" className="sr-only">カテゴリー一覧</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="group block bg-white border-3 sm:border-4 border-black rounded-xl sm:rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(125,255,58,1)] sm:hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
                >
                  <div className="aspect-square bg-gray-100 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl sm:text-6xl font-black text-gray-200 group-hover:text-[#7dff3a] transition-colors" aria-hidden="true">
                        {category.name.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <h3 className="font-black text-lg sm:text-xl mb-1 text-black">{category.name}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">
                      {category.description || ''}
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-gray-400">
                      {category.product_count} items
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
