'use client';

import Link from 'next/link';
import Image from 'next/image';

interface ProductCardToonProps {
  slug: string;
  name: string;
  price: number;
  image: string;
  tag?: 'NEW' | 'SALE' | 'HOT';
}

const tagStyles = {
  NEW: 'bg-[#00ff88] text-black rotate-[-3deg]',
  SALE: 'bg-[#ff3366] text-white rotate-[3deg]',
  HOT: 'bg-[#ffcc00] text-black rotate-[-2deg]',
};

export function ProductCardToon({ slug, name, price, image, tag }: ProductCardToonProps) {
  return (
    <article itemScope itemType="https://schema.org/Product" className="group">
      <Link href={`/products/${slug}`} className="block">
        <div className="relative">
          {/* 背景のぐにゃっとしたシェイプ */}
          <div className="absolute inset-0 bg-[#f5f5f0] rounded-[2rem] rotate-[1deg] scale-[1.01] group-hover:rotate-[2deg] group-hover:scale-[1.02] transition-transform duration-300" />

          {/* メインカード */}
          <div className="relative bg-white border-[5px] border-black rounded-[1.5rem] overflow-hidden transform group-hover:rotate-[-1deg] group-hover:-translate-y-2 transition-all duration-300">
            {/* 画像エリア - 波線ボーダー風 */}
            <figure className="relative aspect-square bg-gradient-to-br from-[#fff5f5] to-[#f5f5ff] overflow-hidden">
              {/* ジグザグボーダー */}
              <div className="absolute bottom-0 left-0 right-0 h-4 z-10">
                <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0,10 L5,0 L10,10 L15,0 L20,10 L25,0 L30,10 L35,0 L40,10 L45,0 L50,10 L55,0 L60,10 L65,0 L70,10 L75,0 L80,10 L85,0 L90,10 L95,0 L100,10 L100,10 L0,10 Z" fill="white" stroke="black" strokeWidth="2" />
                </svg>
              </div>

              <Image
                src={image}
                alt=""
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                sizes="(max-width: 768px) 50vw, 25vw"
                loading="lazy"
              />

              {/* タグ - 斜めに配置 */}
              {tag && (
                <span className={`absolute top-4 left-4 px-4 py-2 text-sm font-black border-[3px] border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider transform ${tagStyles[tag]}`}>
                  {tag}
                </span>
              )}

              {/* コミック風の光沢 */}
              <div className="absolute top-3 right-3 w-8 h-8 opacity-60">
                <svg viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1.5">
                  <path d="M12 2L14 8L20 8L15 12L17 18L12 14L7 18L9 12L4 8L10 8Z" />
                </svg>
              </div>
            </figure>

            {/* コンテンツエリア */}
            <div className="p-4 bg-white relative">
              {/* 吹き出し風の商品名 */}
              <div className="relative bg-[#f0f0f0] border-[3px] border-black rounded-xl p-3 mb-3">
                <h3 className="text-sm font-black text-black uppercase tracking-tight line-clamp-2" itemProp="name">
                  {name}
                </h3>
                {/* 吹き出しの三角 */}
                <div className="absolute -bottom-3 left-6 w-4 h-4 bg-[#f0f0f0] border-r-[3px] border-b-[3px] border-black rotate-45 transform translate-y-[-50%]" />
              </div>

              {/* 価格 - ポップなスタイル */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center bg-[#ff3366] text-white px-3 py-1.5 rounded-full border-[3px] border-black font-black text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform rotate-[-1deg]">
                  ¥{price.toLocaleString()}
                </span>

                {/* カートアイコン */}
                <button
                  className="ml-auto w-10 h-10 bg-[#00ff88] border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                  aria-label="カートに追加"
                  onClick={(e) => e.preventDefault()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
