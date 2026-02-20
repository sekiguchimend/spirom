'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Package, CreditCard, RotateCcw, ChevronDown, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  category: string;
  color: string;
  items: FAQItem[];
}

interface FAQDict {
  meta: { title: string; description: string };
  hero: { title: string; tagline: string };
  categories: FAQCategory[];
  cta: { title: string; description: string; button: string };
  qna: string;
}

const categoryIcons: Record<string, LucideIcon> = {
  ORDER: ShoppingCart,
  SHIPPING: Package,
  PAYMENT: CreditCard,
  RETURNS: RotateCcw,
};

function FAQItemComponent({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white border-4 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <dt>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
          aria-expanded={isOpen}
        >
          <span className="font-bold text-base text-black">{question}</span>
          <ChevronDown
            size={24}
            strokeWidth={3}
            className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </dt>
      <dd className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="p-4 pt-0 border-t-2 border-gray-200">
          <p className="text-gray-600">{answer}</p>
        </div>
      </dd>
    </div>
  );
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dict, setDict] = useState<FAQDict | null>(null);
  const pathname = usePathname();
  const locale = (pathname?.split('/')[1] as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);

  // 翻訳を読み込む
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const translations = await import(`@/locales/${locale}/faq.json`);
        setDict(translations.default || translations);
      } catch {
        const fallback = await import(`@/locales/${defaultLocale}/faq.json`);
        setDict(fallback.default || fallback);
      }
    };
    loadTranslations();
  }, [locale]);

  if (!dict) {
    return (
      <div className="min-h-screen bg-[#FFFFF5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: dict.categories.flatMap((category) =>
      category.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      }))
    ),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <div className="min-h-screen bg-[#FFFFF5]">
        {/* ヒーローセクション */}
        <section className="py-20 px-4" aria-labelledby="page-title">
          <header className="max-w-4xl mx-auto text-center">
            <h1
              id="page-title"
              className="text-6xl md:text-8xl font-black tracking-wide mb-6 text-black"
              style={{
                fontFamily: 'var(--font-anton), sans-serif',
                textShadow: '4px 4px 0px #00d4ff',
              }}
            >
              {dict.hero.title}
            </h1>
            <p className="text-xl font-bold uppercase tracking-wider bg-black text-white px-6 py-3 inline-block border-3 border-black">
              {dict.hero.tagline}
            </p>
          </header>
        </section>

        {/* カテゴリタブ */}
        <nav className="max-w-4xl mx-auto px-4 mb-12" aria-label="FAQカテゴリ">
          <div className="flex flex-wrap justify-center gap-3">
            {dict.categories.map((cat) => {
              const Icon = categoryIcons[cat.category] || ShoppingCart;
              return (
                <button
                  key={cat.category}
                  onClick={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
                  className={`px-5 py-3 font-black uppercase tracking-wider border-3 border-black rounded-xl transition-all flex items-center gap-2 ${
                    activeCategory === cat.category
                      ? 'bg-black text-white shadow-none translate-x-1 translate-y-1'
                      : 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                  }`}
                >
                  <Icon size={20} strokeWidth={2.5} />
                  {cat.category}
                </button>
              );
            })}
          </div>
        </nav>

        {/* FAQ セクション */}
        <div className="max-w-4xl mx-auto px-4 pb-16">
          {dict.categories.map((category) => {
            const Icon = categoryIcons[category.category] || ShoppingCart;
            return (
              <section
                key={category.category}
                className={`mb-12 ${activeCategory && activeCategory !== category.category ? 'hidden' : ''}`}
              >
                {/* カテゴリヘッダー */}
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-14 h-14 flex items-center justify-center border-3 border-black rounded-xl"
                    style={{ backgroundColor: category.color }}
                  >
                    <Icon size={28} strokeWidth={2.5} />
                  </div>
                  <h2
                    className="text-2xl md:text-3xl font-black uppercase tracking-wide text-black"
                    style={{ fontFamily: 'var(--font-anton), sans-serif' }}
                  >
                    {category.category}
                  </h2>
                  <span className="ml-auto px-3 py-1 bg-black text-white text-sm font-bold rounded-full">
                    {category.items.length} {dict.qna}
                  </span>
                </div>

                {/* FAQ アイテム */}
                <dl className="space-y-4">
                  {category.items.map((item, index) => (
                    <FAQItemComponent key={index} question={item.question} answer={item.answer} />
                  ))}
                </dl>
              </section>
            );
          })}
        </div>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 pb-20" aria-labelledby="cta-heading">
          <div className="bg-[#323232] text-white border-4 border-black rounded-2xl p-8 md:p-12 text-center shadow-[8px_8px_0px_0px_rgba(125,255,58,1)]">
            <h2
              id="cta-heading"
              className="text-3xl md:text-4xl font-black mb-4 uppercase tracking-wide"
              style={{ fontFamily: 'var(--font-anton), sans-serif' }}
            >
              {dict.cta.title}
            </h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              {dict.cta.description}
            </p>
            <Link
              href={routes.CONTACT}
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#7dff3a] text-black font-black uppercase tracking-wider border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
            >
              {dict.cta.button}
              <ArrowRight size={20} strokeWidth={3} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
