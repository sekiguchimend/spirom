import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Categories',
  description: '商品カテゴリー一覧',
};

// TODO: 実際の実装ではAPIからカテゴリーを取得
const mockCategories = [
  {
    id: '1',
    slug: 'bags',
    name: 'バッグ',
    description: 'トートバッグ、ショルダーバッグなど',
    image: '/categories/bags.jpg',
    productCount: 12,
  },
  {
    id: '2',
    slug: 'interior',
    name: 'インテリア',
    description: 'コースター、花瓶、キャンドルなど',
    image: '/categories/interior.jpg',
    productCount: 8,
  },
  {
    id: '3',
    slug: 'accessories',
    name: 'アクセサリー',
    description: 'ピアス、ネックレス、リングなど',
    image: '/categories/accessories.jpg',
    productCount: 15,
  },
  {
    id: '4',
    slug: 'stationery',
    name: 'ステーショナリー',
    description: 'ノート、ペンケース、カードなど',
    image: '/categories/stationery.jpg',
    productCount: 6,
  },
];

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-20">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {mockCategories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group bg-white border-3 sm:border-4 border-black rounded-xl sm:rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(125,255,58,1)] sm:hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
            >
              <div className="aspect-square bg-gray-100 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl sm:text-6xl font-black text-gray-200 group-hover:text-[#7dff3a] transition-colors">
                    {category.name.charAt(0)}
                  </span>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <h2 className="font-black text-lg sm:text-xl mb-1 text-black">{category.name}</h2>
                <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">
                  {category.description}
                </p>
                <p className="text-xs sm:text-sm font-bold text-gray-400">
                  {category.productCount} items
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
