'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Package, CreditCard, RotateCcw, ChevronDown, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { safeJsonLd } from '@/lib/safeJsonLd';

interface FAQCategory {
  category: string;
  icon: LucideIcon;
  color: string;
  items: { question: string; answer: string }[];
}

const faqs: FAQCategory[] = [
  {
    category: 'ORDER',
    icon: ShoppingCart,
    color: '#7dff3a',
    items: [
      { question: '注文後のキャンセルはできますか？', answer: '発送準備前であればキャンセル可能です。マイページの注文履歴からキャンセル手続きを行うか、お問い合わせフォームよりご連絡ください。' },
      { question: '注文内容の変更はできますか？', answer: '発送準備前であれば、数量変更や商品の追加・削除が可能です。お問い合わせフォームより、注文番号と変更内容をお知らせください。' },
      { question: '領収書は発行できますか？', answer: 'はい、発行可能です。ご注文時に備考欄にその旨をご記入いただくか、お問い合わせフォームよりご連絡ください。' },
    ],
  },
  {
    category: 'SHIPPING',
    icon: Package,
    color: '#00d4ff',
    items: [
      { question: '送料はいくらですか？', answer: '全国一律750円（税込）です。' },
      { question: '届くまでどのくらいかかりますか？', answer: 'ご注文確認後、約2週間でお届けいたします。' },
      { question: '配送日時の指定はできますか？', answer: '申し訳ございませんが、現在は配送日時の指定には対応しておりません。' },
      { question: '海外発送は対応していますか？', answer: '現在、日本国内のみの発送となっております。海外発送は今後対応予定です。' },
    ],
  },
  {
    category: 'PAYMENT',
    icon: CreditCard,
    color: '#ff2d78',
    items: [
      { question: '利用できる支払い方法は？', answer: 'クレジットカード（VISA、Mastercard、JCB、American Express）、PayPay、コンビニ決済、銀行振込がご利用いただけます。' },
      { question: 'クレジットカードの分割払いはできますか？', answer: '一括払いのみのお取り扱いとなっております。分割払いをご希望の場合は、カード会社にて後から変更できる場合がございます。' },
    ],
  },
  {
    category: 'RETURNS',
    icon: RotateCcw,
    color: '#ffd93d',
    items: [
      { question: '返品・交換はできますか？', answer: '商品到着後7日以内であれば、未使用・未開封の商品に限り返品・交換を承ります。お客様都合の返品の場合、送料はお客様負担となります。' },
      { question: '不良品が届いた場合は？', answer: '大変申し訳ございません。商品到着後7日以内にお問い合わせフォームよりご連絡ください。送料当店負担で交換または返金対応いたします。' },
    ],
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.flatMap((category) =>
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
              FAQ
            </h1>
            <p className="text-xl font-bold uppercase tracking-wider bg-black text-white px-6 py-3 inline-block border-3 border-black">
              GOT QUESTIONS? WE GOT ANSWERS!
            </p>
          </header>
        </section>

        {/* カテゴリタブ */}
        <nav className="max-w-4xl mx-auto px-4 mb-12" aria-label="FAQカテゴリ">
          <div className="flex flex-wrap justify-center gap-3">
            {faqs.map((cat) => {
              const Icon = cat.icon;
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
          {faqs.map((category) => {
            const Icon = category.icon;
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
                    {category.items.length} Q&A
                  </span>
                </div>

                {/* FAQ アイテム */}
                <dl className="space-y-4">
                  {category.items.map((item, index) => (
                    <FAQItem key={index} question={item.question} answer={item.answer} />
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
              STILL CONFUSED?
            </h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              お探しの回答が見つからない場合は、お気軽にお問い合わせください！
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#7dff3a] text-black font-black uppercase tracking-wider border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
            >
              CONTACT US
              <ArrowRight size={20} strokeWidth={3} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
