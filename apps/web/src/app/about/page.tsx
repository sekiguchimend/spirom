import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Settings, Leaf, Heart, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: "About Us",
  description: "Spiromは「心地よい暮らし」をテーマに、こだわりのライフスタイルアイテムをお届けするオンラインショップです。",
  openGraph: {
    title: "About Us | Spirom",
    description: "心地よい暮らしをテーマに、こだわりのアイテムをお届けします。",
  },
};

const values = [
  {
    icon: Settings,
    title: 'QUALITY',
    description: '厳選された素材と職人の技。長く愛用いただける品質をお約束します。',
    color: '#7dff3a',
  },
  {
    icon: Leaf,
    title: 'SUSTAINABLE',
    description: '環境に配慮した素材選びと製造プロセス。持続可能な暮らしを応援します。',
    color: '#00d4ff',
  },
  {
    icon: Heart,
    title: 'CONNECTION',
    description: '一人ひとりのお客様との出会いを大切に。心のこもったサービスをお届けします。',
    color: '#ff2d78',
  },
];

const team = [
  {
    name: '山田 太郎',
    role: 'CEO & FOUNDER',
    image: '/team/yamada.jpg',
    bio: '「良いものを長く使う」をモットーに、Spiromを創業。',
  },
  {
    name: '田中 花子',
    role: 'CREATIVE DIRECTOR',
    image: '/team/tanaka.jpg',
    bio: '商品セレクションからブランディングまでを担当。',
  },
  {
    name: '鈴木 一郎',
    role: 'HEAD BUYER',
    image: '/team/suzuki.jpg',
    bio: '国内外のこだわりアイテムを発掘。',
  },
];

const milestones = [
  { year: '2018', event: 'SPIROM FOUNDED' },
  { year: '2019', event: 'FIRST STORE OPENED IN TOKYO' },
  { year: '2020', event: 'ONLINE SHOP LAUNCHED' },
  { year: '2021', event: 'ORIGINAL PRODUCT LINE' },
  { year: '2022', event: 'SUSTAINABLE CERTIFICATION' },
  { year: '2023', event: '10,000+ MEMBERS' },
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

      <div className="min-h-screen bg-[#FFFFF5]">
        {/* ヒーローセクション */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1
              className="text-6xl md:text-8xl font-black mb-6 tracking-tighter"
              style={{
                fontFamily: 'var(--font-anton), sans-serif',
                textShadow: '4px 4px 0px #7dff3a',
              }}
            >
              ABOUT US
            </h1>
            <p className="text-xl md:text-2xl font-bold uppercase tracking-wider max-w-2xl mx-auto bg-black text-white px-6 py-3 inline-block border-3 border-black">
              WE CREATE PRODUCTS FOR COMFORTABLE LIVING
            </p>
          </div>
        </section>

        {/* ミッション */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border-4 border-black rounded-3xl p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2
                className="text-3xl md:text-4xl font-black mb-6 uppercase tracking-tight"
                style={{ fontFamily: 'var(--font-anton), sans-serif' }}
              >
                OUR MISSION
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Spiromは2018年に「良いものを長く使う」という想いから始まりました。
                大量生産・大量消費の時代に、本当に価値のあるものを選ぶ喜びをお届けしたい。
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                私たちが選ぶのは、作り手の想いが込められた、長く使い続けられる商品ばかり。
                一つひとつの商品を通じて、心地よい暮らしのお手伝いができれば幸いです。
              </p>
            </div>
          </div>
        </section>

        {/* バリュー */}
        <section className="py-16 px-4 bg-black">
          <div className="max-w-7xl mx-auto">
            <h2
              className="text-4xl md:text-5xl font-black text-white mb-12 text-center uppercase tracking-tight"
              style={{ fontFamily: 'var(--font-anton), sans-serif' }}
            >
              OUR VALUES
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {values.map((value, index) => (
                <li
                  key={index}
                  className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(125,255,58,1)] hover:-translate-y-1 transition-transform"
                >
                  <div
                    className="w-16 h-16 border-3 border-black rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: value.color }}
                  >
                    <value.icon size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-black text-xl mb-3 uppercase tracking-tight">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* チーム */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2
              className="text-4xl md:text-5xl font-black mb-12 text-center uppercase tracking-tight"
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
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </figure>
                  <div className="p-5 text-center">
                    <h3 className="font-black text-xl">{member.name}</h3>
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
        <section className="py-16 px-4 bg-[#7dff3a]">
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-4xl md:text-5xl font-black mb-12 text-center uppercase tracking-tight"
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
                  <span className="font-bold uppercase tracking-wide">{milestone.event}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2
              className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-tight"
              style={{ fontFamily: 'var(--font-anton), sans-serif' }}
            >
              JOIN OUR JOURNEY
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Spiromのこだわりアイテムで、あなたの日常に彩りを添えてみませんか？
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-black uppercase tracking-wider bg-black text-white border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
              >
                SHOP NOW
                <ArrowRight size={20} strokeWidth={3} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-black uppercase tracking-wider bg-white text-black border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
              >
                CONTACT US
                <ArrowRight size={20} strokeWidth={3} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
