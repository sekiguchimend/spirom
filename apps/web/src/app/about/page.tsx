import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';

export const metadata: Metadata = {
  title: "About Us",
  description: "Spiromは「大人もきれるカートゥーン」をコンセプトに、遊び心と洗練されたデザインを融合したファッションブランドです。",
  openGraph: {
    title: "About Us | Spirom",
    description: "大人もきれるカートゥーン。遊び心あふれる洗練されたファッションをお届けします。",
  },
};

const valuesData = [
  {
    iconType: 'settings' as const,
    title: 'PLAYFUL',
    description: 'カートゥーンの遊び心を大人のスタイルに。毎日のファッションをもっと楽しく。',
    color: '#7dff3a',
  },
  {
    iconType: 'leaf' as const,
    title: 'SOPHISTICATED',
    description: 'ポップでありながら洗練されたデザイン。大人が自信を持って着られるクオリティ。',
    color: '#00d4ff',
  },
  {
    iconType: 'heart' as const,
    title: 'ORIGINAL',
    description: '他にはない独自のアートワーク。あなたの個性を引き立てるユニークなアイテム。',
    color: '#ff2d78',
  },
];

function ValueIcon({ type }: { type: 'settings' | 'leaf' | 'heart' }) {
  const props = { width: 32, height: 32, strokeWidth: 2.5, stroke: "currentColor", fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case 'settings':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'leaf':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      );
  }
}

function ArrowRightIcon() {
  return (
    <svg width={20} height={20} strokeWidth={3} stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

const team = [
  {
    name: '関口 峻矢',
    role: 'ENGINEER',
    image: '/spirom.png',
    bio: 'テクノロジーでブランドの可能性を広げる。サイト開発・システム構築を担当。',
  },
  {
    name: '関口 時正',
    role: 'DESIGNER',
    image: '/spirom.png',
    bio: 'カートゥーンの世界観を大人のファッションに落とし込むデザインを手がける。',
  },
  {
    name: 'ジャンマルコ',
    role: 'PR & MODEL',
    image: '/spirom.png',
    bio: 'ブランドの顔として広報活動とモデルを兼任。Spiromの魅力を世界に発信。',
  },
];

const milestones = [
  { year: '2018', event: 'SPIROM FOUNDED' },
  { year: '2019', event: 'FIRST POPUP STORE IN TOKYO' },
  { year: '2020', event: 'ONLINE SHOP LAUNCHED' },
  { year: '2021', event: 'FIRST ORIGINAL COLLECTION' },
  { year: '2022', event: 'ARTIST COLLABORATION START' },
  { year: '2023', event: '10,000+ FANS WORLDWIDE' },
];

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    mainEntity: {
      '@type': 'Organization',
      name: 'Spirom',
      description: '大人もきれるカートゥーンをコンセプトにしたファッションブランド',
      foundingDate: '2018',
      url: 'https://spirom.com',
      logo: 'https://spirom.com/logo.png',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <div className="min-h-screen bg-[#FFFFF5]">
        {/* ヒーローセクション */}
        <section className="py-20 px-4" aria-labelledby="page-title">
          <header className="max-w-7xl mx-auto text-center">
            <h1
              id="page-title"
              className="text-6xl md:text-8xl font-black mb-6 tracking-wide text-black"
              style={{
                fontFamily: 'var(--font-anton), sans-serif',
                textShadow: '4px 4px 0px #7dff3a',
              }}
            >
              ABOUT US
            </h1>
            <p className="text-xl md:text-2xl font-bold uppercase tracking-wider max-w-2xl mx-auto bg-black text-white px-6 py-3 inline-block border-3 border-black">
              CARTOON FASHION FOR GROWN-UPS
            </p>
          </header>
        </section>

        {/* ミッション */}
        <section className="py-16 px-4" aria-labelledby="mission-heading">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border-4 border-black rounded-3xl p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2
                id="mission-heading"
                className="text-3xl md:text-4xl font-black mb-6 uppercase tracking-wide text-black"
                style={{ fontFamily: 'var(--font-anton), sans-serif' }}
              >
                OUR MISSION
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Spiromは2018年に「大人だってカートゥーンを楽しみたい」という想いから始まりました。
                カートゥーンやアニメのポップなエッセンスを、大人が着ても様になるファッションに。
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                私たちがデザインするのは、遊び心と洗練を両立させたアイテムばかり。
                一着一着を通じて、あなたの日常にワクワクを届けられたら幸いです。
              </p>
            </div>
          </div>
        </section>

        {/* バリュー */}
        <section className="py-16 px-4 bg-black" aria-labelledby="values-heading">
          <div className="max-w-7xl mx-auto">
            <h2
              id="values-heading"
              className="text-4xl md:text-5xl font-black text-white mb-12 text-center uppercase tracking-wide"
              style={{ fontFamily: 'var(--font-anton), sans-serif' }}
            >
              OUR VALUES
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {valuesData.map((value, index) => (
                <li
                  key={index}
                  className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(125,255,58,1)] hover:-translate-y-1 transition-transform"
                >
                  <div
                    className="w-16 h-16 border-3 border-black rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: value.color }}
                  >
                    <ValueIcon type={value.iconType} />
                  </div>
                  <h3 className="font-black text-xl mb-3 uppercase tracking-wide">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* チーム */}
        <section className="py-16 px-4" aria-labelledby="team-heading">
          <div className="max-w-7xl mx-auto">
            <h2
              id="team-heading"
              className="text-4xl md:text-5xl font-black mb-12 text-center uppercase tracking-wide text-black"
              style={{ fontFamily: 'var(--font-anton), sans-serif' }}
            >
              OUR TEAM
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {team.map((member) => (
                <li
                  key={member.name}
                  className="bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
                >
                  <figure className="aspect-square relative bg-gray-100 border-b-4 border-black">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </figure>
                  <div className="p-5 text-center">
                    <h3 className="font-black text-xl text-black">{member.name}</h3>
                    <p className="text-sm font-bold text-white bg-[#ff2d78] px-3 py-1 inline-block mt-2 uppercase tracking-wider border-2 border-black rounded-full">
                      {member.role}
                    </p>
                    <p className="text-sm text-gray-600 mt-3">{member.bio}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 沿革 */}
        <section className="py-16 px-4 bg-[#7dff3a]" aria-labelledby="history-heading">
          <div className="max-w-3xl mx-auto">
            <h2
              id="history-heading"
              className="text-4xl md:text-5xl font-black mb-12 text-center uppercase tracking-wide text-black"
              style={{ fontFamily: 'var(--font-anton), sans-serif' }}
            >
              HISTORY
            </h2>
            <ol className="space-y-4">
              {milestones.map((milestone, index) => (
                <li
                  key={index}
                  className="bg-white border-4 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4 hover:-translate-y-1 transition-transform"
                >
                  <span className="text-2xl font-black bg-black text-white px-4 py-2 rounded-lg min-w-[80px] text-center">
                    {milestone.year}
                  </span>
                  <span className="font-bold uppercase tracking-wide text-black">{milestone.event}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4" aria-labelledby="cta-heading">
          <div className="max-w-4xl mx-auto text-center">
            <h2
              id="cta-heading"
              className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-wide text-black"
              style={{ fontFamily: 'var(--font-anton), sans-serif' }}
            >
              JOIN OUR JOURNEY
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Spiromのアイテムで、あなたのファッションにワクワクをプラスしませんか？
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-black uppercase tracking-wider bg-black text-white border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
              >
                SHOP NOW
                <ArrowRightIcon />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-black uppercase tracking-wider bg-white text-black border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
              >
                CONTACT US
                <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
