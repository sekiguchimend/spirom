import { CategoryPill, ProductCard } from '@/components/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getFeaturedProducts } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Spirom - 大人もきれるカートゥーン',
  description: '遊び心と洗練を融合した、大人のためのカートゥーンファッションブランド。',
};

const categories = [
  { slug: 'tops', name: 'Tops' },
  { slug: 'bottoms', name: 'Bottoms' },
  { slug: 'outerwear', name: 'Outerwear' },
  { slug: 'accessories', name: 'Accessories' },
];

export default async function Home() {
  // Supabaseから注目商品を取得
  const products = await getFeaturedProducts(4);
  return (
    <div className="flex flex-col w-full">
      {/* SEO用h1（視覚的に非表示） */}
      <h1 className="sr-only">Spirom - 大人もきれるカートゥーン｜遊び心と洗練を融合したファッションブランド</h1>

      {/*
        Hero Section - Juice Agency Clone
        背景色: brand-green (globals.cssで定義)
      */}
      <section className="relative w-full h-[100svh] overflow-hidden flex flex-col" aria-label="ヒーローセクション">

        {/* モバイル用サブテキスト - HTMLで表示（階段形式） */}
        <div className="absolute top-[48%] left-4 right-4 z-10 sm:hidden">
          <div className="font-mono text-lg font-bold text-brand-black uppercase leading-loose flex flex-col">
            <span>Playful yet refined,</span>
            <span>cartoon-inspired fashion</span>
            <span>designed for grown-ups who</span>
            <span>dare to stand out.</span>
          </div>
        </div>

        {/* 背景の巨大文字 - モバイルとPCで別々のviewBoxを使用 */}
        <div className="absolute inset-0 flex items-center justify-center z-0 select-none pointer-events-none overflow-hidden">
          {/* モバイル用 - SVGはSPIROMのみ、サブテキストは別途HTMLで */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 400 600"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full sm:hidden"
          >
            <defs>
              <filter id="rounded-corners-mobile">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
              </filter>
            </defs>
            <text
              x="50%"
              y="30%"
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--color-brand-cream)"
              style={{
                fontFamily: 'var(--font-anton), Impact, "Arial Black", sans-serif',
                fontSize: '105px',
                fontWeight: '900',
                letterSpacing: '0.02em',
                filter: 'url(#rounded-corners-mobile)',
                transform: 'scaleY(0.9)',
                transformBox: 'fill-box',
                transformOrigin: 'center',
              }}
            >
              SPIROM
            </text>
          </svg>

          {/* PC用 */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1000 500"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full hidden sm:block"
          >
            <defs>
              <filter id="rounded-corners">
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
        <div className="absolute inset-0 z-10 flex items-center sm:items-end justify-center pointer-events-none pb-0">
          <div className="relative w-[70vw] h-[70vw] sm:w-[45vh] sm:h-[45vh] md:w-[80vh] md:h-[80vh] flex items-center justify-center translate-y-[5%] sm:translate-y-[20%]">
             <Image
               src="/s.png"
               alt="Main Visual"
               fill
               className="object-contain"
               priority
             />
          </div>
        </div>

        {/* テキストコンテンツレイヤー - PC用のみ */}
        <div className="relative z-20 flex-1 hidden sm:flex flex-col justify-end p-6 md:p-12 pb-12">
          <div className="flex justify-end">
            <div className="text-right max-w-sm">
              <p className="font-mono text-xs md:text-sm font-bold text-brand-black uppercase leading-relaxed">
                Playful yet refined, <br/>
                cartoon-inspired fashion <br/>
                for grown-ups who dare to stand out.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EC Section - ここから下は白背景のECサイト */}
      <section id="products" className="w-full py-12 sm:py-20 px-3 sm:px-4 bg-[#FFFFF5] text-black relative z-30 rounded-t-[2rem] sm:rounded-t-[3rem] mt-4 sm:mt-8 shadow-2xl" aria-labelledby="selected-items-heading">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 sm:mb-12 pb-6 sm:pb-8 border-b border-gray-200">
            <div>
              <h2 id="selected-items-heading" className="text-3xl sm:text-5xl md:text-6xl font-black tracking-wide mb-1 sm:mb-2" style={{ fontFamily: 'var(--font-anton), sans-serif' }}>SELECTED ITEMS</h2>
              <p className="text-gray-500 font-bold uppercase tracking-wider text-xs sm:text-sm">Curated products for your lifestyle.</p>
            </div>

            <div className="mt-4 md:mt-0">
              <Link href="/products" className="text-xs sm:text-sm font-bold border-b-2 border-black pb-1 hover:text-gray-600 transition-colors">
                VIEW ALL PRODUCTS
              </Link>
            </div>
          </div>

          {/* カテゴリ */}
          <nav className="mb-8 sm:mb-12 overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
            <ul className="flex gap-2 sm:gap-4 min-w-max">
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
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-3 sm:gap-x-6 gap-y-6 sm:gap-y-10">
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
