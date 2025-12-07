'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* 固定ヘッダーではなく、絶対配置でオーバーレイさせるスタイルに変更 */}
      <header className="absolute top-0 left-0 w-full z-50 p-3 md:p-4 flex justify-between items-start mix-blend-normal">
        {/* 左上: ロゴ */}
        <Link href="/" className="block relative w-20 h-20 md:w-28 md:h-28" aria-label="Spirom Home">
          <Image
            src="/spirom.png"
            alt="Spirom Logo"
            fill
            className="object-contain"
            priority
          />
        </Link>

        {/* 中央上: 通知バー（PCのみ表示） */}
        <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-4">
          <Link 
            href="/about" 
            className="inline-flex text-black items-center gap-2 bg-brand-cream/90 backdrop-blur px-4 py-2 rounded text-xs font-bold uppercase tracking-widest border border-black/10 hover:bg-white transition-colors"
          >
            We rebranded with purpose. Read the story
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* 右上: ハンバーガーメニュー */}
        <button
          type="button"
          className="w-12 h-12 md:w-14 md:h-14 bg-black text-brand-cream flex flex-col items-center justify-center gap-1.5 rounded hover:bg-gray-900 transition-colors duration-200 flex-shrink-0"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open menu"
        >
          <span className="w-6 h-0.5 bg-current block"></span>
          <span className="w-6 h-0.5 bg-current block"></span>
        </button>
      </header>

      {/* フルスクリーンメニューオーバーレイ */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black text-brand-cream flex flex-col">
          <div className="p-6 md:p-8 flex justify-end">
             <button
              type="button"
              className="w-12 h-12 flex items-center justify-center text-brand-cream hover:text-white transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            >
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l20 20M6 26L26 6"/>
              </svg>
            </button>
          </div>
          
          <nav className="flex-1 flex flex-col justify-center items-center">
            <ul className="space-y-6 text-center">
              <li><Link href="/" className="text-4xl md:text-6xl font-black uppercase tracking-tighter hover:text-brand-green transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>Home</Link></li>
              <li><Link href="/products" className="text-4xl md:text-6xl font-black uppercase tracking-tighter hover:text-brand-green transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>Shop</Link></li>
              <li><Link href="/blog" className="text-4xl md:text-6xl font-black uppercase tracking-tighter hover:text-brand-green transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>Blog</Link></li>
              <li><Link href="/about" className="text-4xl md:text-6xl font-black uppercase tracking-tighter hover:text-brand-green transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>About</Link></li>
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
