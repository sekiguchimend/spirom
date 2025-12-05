import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "私たちについて",
  description: "Spiromは「心地よい暮らし」をテーマに、こだわりのライフスタイルアイテムをお届けするオンラインショップです。",
  openGraph: {
    title: "私たちについて | Spirom",
    description: "心地よい暮らしをテーマに、こだわりのアイテムをお届けします。",
  },
};

const values = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    title: '品質へのこだわり',
    description: '厳選された素材と職人の技。長く愛用いただける品質をお約束します。',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z"/>
        <path d="M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z"/>
        <path d="M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z"/>
      </svg>
    ),
    title: 'サステナビリティ',
    description: '環境に配慮した素材選びと製造プロセス。持続可能な暮らしを応援します。',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
    ),
    title: 'お客様との絆',
    description: '一人ひとりのお客様との出会いを大切に。心のこもったサービスをお届けします。',
  },
];

const team = [
  {
    name: '山田 太郎',
    role: '代表取締役',
    image: '/team/yamada.jpg',
    bio: '「良いものを長く使う」をモットーに、Spiromを創業。',
  },
  {
    name: '田中 花子',
    role: 'クリエイティブディレクター',
    image: '/team/tanaka.jpg',
    bio: '商品セレクションからブランディングまでを担当。',
  },
  {
    name: '鈴木 一郎',
    role: 'バイヤー',
    image: '/team/suzuki.jpg',
    bio: '国内外のこだわりアイテムを発掘。',
  },
];

const milestones = [
  { year: '2018', event: 'Spirom設立' },
  { year: '2019', event: '実店舗オープン（東京・目黒）' },
  { year: '2020', event: 'オンラインショップ開始' },
  { year: '2021', event: 'オリジナル商品ライン発売' },
  { year: '2022', event: 'サステナブル認証取得' },
  { year: '2023', event: '会員数10,000人突破' },
];

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    mainEntity: {
      '@type': 'Organization',
      name: 'Spirom',
      description: 'こだわりの暮らしを届けるオンラインショップ',
      foundingDate: '2018',
      url: 'https://spirom.com',
      logo: 'https://spirom.com/logo.png',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* パンくずリスト */}
      <nav aria-label="パンくずリスト" className="bg-[var(--color-bg-alt)] py-4">
        <div className="max-w-7xl mx-auto px-4">
          <ol className="flex items-center gap-2 text-sm" itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link href="/" itemProp="item" className="text-[var(--color-text-light)] hover:text-[var(--color-primary)]">
                <span itemProp="name">ホーム</span>
              </Link>
              <meta itemProp="position" content="1" />
            </li>
            <li aria-hidden="true" className="text-[var(--color-text-muted)]">/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" className="text-[var(--color-text)]">私たちについて</span>
              <meta itemProp="position" content="2" />
            </li>
          </ol>
        </div>
      </nav>

      {/* ヒーローセクション */}
      <section aria-labelledby="about-heading" className="relative overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 border-4 border-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-60 h-60 border-4 border-white rounded-full" />
        </div>
        <div className="max-w-4xl mx-auto px-4 py-20 md:py-28 text-center relative">
          <h1 id="about-heading" className="text-4xl md:text-5xl font-bold heading-display mb-6">
            私たちについて
          </h1>
          <p className="text-xl md:text-2xl opacity-90 leading-relaxed">
            「心地よい暮らし」をテーマに、<br className="hidden md:block" />
            こだわりのライフスタイルアイテムをお届けします。
          </p>
        </div>
      </section>

      {/* ミッション */}
      <section aria-labelledby="mission-heading" className="section">
        <div className="max-w-4xl mx-auto text-center">
          <h2 id="mission-heading" className="text-3xl md:text-4xl font-bold heading-display heading-decorated mb-8">
            私たちのミッション
          </h2>
          <p className="text-lg text-[var(--color-text-light)] leading-relaxed mb-8">
            Spiromは2018年に「良いものを長く使う」という想いから始まりました。
            大量生産・大量消費の時代に、本当に価値のあるものを選ぶ喜びをお届けしたい。
            そんな想いで、厳選されたアイテムをお客様にお届けしています。
          </p>
          <p className="text-lg text-[var(--color-text-light)] leading-relaxed">
            私たちが選ぶのは、作り手の想いが込められた、
            長く使い続けられる商品ばかり。
            一つひとつの商品を通じて、
            心地よい暮らしのお手伝いができれば幸いです。
          </p>
        </div>
      </section>

      {/* 大切にしている価値観 */}
      <section aria-labelledby="values-heading" className="section section-alt">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-12">
            <h2 id="values-heading" className="text-3xl md:text-4xl font-bold heading-display heading-decorated mb-4">
              大切にしている価値観
            </h2>
            <p className="text-[var(--color-text-light)]">
              Spiromのものづくりを支える3つの柱
            </p>
          </header>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <li key={index} className="card p-8 text-center">
                <div className="w-16 h-16 bg-[var(--color-primary)] bg-opacity-10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[var(--color-primary)]">
                  {value.icon}
                </div>
                <h3 className="font-bold text-xl heading-display mb-3">{value.title}</h3>
                <p className="text-[var(--color-text-light)]">{value.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* チーム紹介 */}
      <section aria-labelledby="team-heading" className="section">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-12">
            <h2 id="team-heading" className="text-3xl md:text-4xl font-bold heading-display heading-decorated mb-4">
              チーム紹介
            </h2>
            <p className="text-[var(--color-text-light)]">
              Spiromを支えるメンバーたち
            </p>
          </header>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member) => (
              <li key={member.name} className="card overflow-hidden">
                <figure className="aspect-square relative bg-[var(--color-bg-alt)]">
                  <Image
                    src={member.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </figure>
                <div className="p-6 text-center">
                  <h3 className="font-bold text-xl heading-display">{member.name}</h3>
                  <p className="text-[var(--color-primary)] font-medium mb-3">{member.role}</p>
                  <p className="text-sm text-[var(--color-text-light)]">{member.bio}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 沿革 */}
      <section aria-labelledby="history-heading" className="section section-alt">
        <div className="max-w-3xl mx-auto">
          <header className="text-center mb-12">
            <h2 id="history-heading" className="text-3xl md:text-4xl font-bold heading-display heading-decorated mb-4">
              沿革
            </h2>
            <p className="text-[var(--color-text-light)]">
              Spiromの歩み
            </p>
          </header>
          <ol className="relative border-l-3 border-[var(--color-primary)] ml-4">
            {milestones.map((milestone, index) => (
              <li key={index} className="mb-8 ml-8">
                <span className="absolute -left-3 w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                  <span className="w-3 h-3 bg-white rounded-full" />
                </span>
                <div className="card p-4 inline-block">
                  <time className="text-[var(--color-primary)] font-bold text-lg">{milestone.year}</time>
                  <p className="text-[var(--color-text)] font-medium mt-1">{milestone.event}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section aria-labelledby="cta-heading" className="section">
        <div className="max-w-4xl mx-auto text-center">
          <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold heading-display mb-6">
            一緒に心地よい暮らしを
          </h2>
          <p className="text-lg text-[var(--color-text-light)] mb-8">
            Spiromのこだわりアイテムで、<br className="hidden md:block" />
            あなたの日常に彩りを添えてみませんか？
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/products" className="btn btn-primary">
              商品を見る
            </Link>
            <Link href="/contact" className="btn btn-outline">
              お問い合わせ
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
