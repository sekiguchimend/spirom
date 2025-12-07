import { CategoryPill, ProductCard } from '@/components/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getFeaturedProducts } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Spirom - Digital Product Agency & Store',
  description: 'We build digital products and sell curated lifestyle goods.',
};

const categories = [
  { slug: 'kitchen', name: 'Kitchen' },
  { slug: 'interior', name: 'Interior' },
  { slug: 'fashion', name: 'Fashion' },
  { slug: 'outdoor', name: 'Outdoor' },
];

export default async function Home() {
  // Supabaseから注目商品を取得
  const products = await getFeaturedProducts(4);
  return (
    <div className="flex flex-col w-full">
      {/* 
        Hero Section - Juice Agency Clone 
        背景色: brand-green (globals.cssで定義)
      */}
      <section className="relative w-full h-[100svh] overflow-hidden flex flex-col">
        
        {/* 背景の巨大文字 */}
        <div className="absolute inset-0 flex items-center justify-center z-0 select-none pointer-events-none overflow-hidden">
          {/* 
            SVGを使用して文字を描画することで、文字の角を正確に丸める。
            CSSのstroke-linejoin: round では限界があるため、SVGフィルタを使用する。
          */}
          <svg width="100%" height="100%" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
            <defs>
              <filter id="rounded-corners">
                {/* ぼかして、コントラストを上げてエッジをシャープにすることで角を丸める擬似的な手法 */}
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" /> 
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
              </filter>
            </defs>
            <text 
              x="50%" 
              y="42%" 
              textAnchor="middle" 
              dominantBaseline="central" 
              fill="var(--color-brand-cream)"
              style={{
                fontFamily: 'var(--font-anton), Impact, "Arial Black", sans-serif',
                fontSize: '310px',
                fontWeight: '900',
                letterSpacing: '0.02em',
                filter: 'url(#rounded-corners)',
                transform: 'scaleY(0.9)',
                transformBox: 'fill-box',
                transformOrigin: 'center',
              }}
            >
              SPIROM
            </text>
          </svg>
        </div>

        {/* 中央のメインビジュアル（ユーザー差し替え用） */}
        <div className="absolute inset-0 z-10 flex items-end justify-center pointer-events-none pb-0">
          <div className="relative w-[45vh] h-[45vh] md:w-[80vh] md:h-[80vh] flex items-center justify-center translate-y-[20%]">
             <Image
               src="/s.png"
               alt="Main Visual"
               fill
               className="object-contain"
               priority
             />
          </div>
        </div>

        {/* テキストコンテンツレイヤー */}
        <div className="relative z-20 flex-1 flex flex-col justify-end p-6 md:p-12 pb-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            
            {/* 左下: メインコピー */}
            <div className="max-w-2xl">
              {/* 削除 */}
            </div>

            {/* 右下: サブテキスト */}
            <div className="text-right hidden md:block max-w-xs">
              <p className="font-mono text-xs md:text-sm font-bold text-brand-black uppercase leading-tight">
                Impactful digital <br/>
                experiences for <br/>
                ambitious brands
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EC Section - ここから下は白背景のECサイト */}
      <section id="products" className="w-full py-20 px-4 bg-[#FFFFF5] text-black relative z-30 rounded-t-[3rem] mt-8 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 pb-8 border-b border-gray-200">
            <div>
              <h2 className="text-6xl font-black tracking-wide mb-2" style={{ fontFamily: 'var(--font-anton), sans-serif' }}>SELECTED ITEMS</h2>
              <p className="text-gray-500 font-bold uppercase tracking-wider">Curated products for your lifestyle.</p>
            </div>
            
            <div className="mt-6 md:mt-0">
              <Link href="/products" className="text-sm font-bold border-b-2 border-black pb-1 hover:text-gray-600 transition-colors">
                VIEW ALL PRODUCTS
              </Link>
            </div>
          </div>

          {/* カテゴリ */}
          <nav className="mb-12 overflow-x-auto pb-4">
            <ul className="flex gap-4 min-w-max">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <CategoryPill href={`/categories/${cat.slug}`}>
                    {cat.name}
                  </CategoryPill>
                </li>
              ))}
            </ul>
          </nav>

          {/* 商品グリッド */}
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard
                  slug={product.slug}
                  name={product.name}
                  price={product.price}
                  image={product.images[0] || '/placeholder-product.jpg'}
                  tag={product.tags.includes('new') ? 'NEW' : product.tags.includes('sale') ? 'SALE' : undefined}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
