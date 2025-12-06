import { Metadata } from "next";
import { ContentCard, CategoryPill } from "@/components/ui";

export const metadata: Metadata = {
  title: "ブログ",
  description: "暮らしのヒントや商品の使い方、スタッフおすすめの情報をお届けするSpiromのブログです。",
  openGraph: {
    title: "ブログ | Spirom",
    description: "暮らしのヒントや商品の使い方をお届けします。",
  },
};

// モックデータ（実際はSanity CMSから取得）
const posts = [
  {
    id: '1',
    slug: 'sustainable-living',
    title: 'サステナブルな暮らしを始めよう',
    excerpt: '環境に優しい選択が、心地よい暮らしにつながります。日常でできる小さな一歩から始めてみませんか。',
    date: '2024-12-01',
    image: '/blog/sustainable.jpg',
    category: 'ライフスタイル',
  },
  {
    id: '2',
    slug: 'home-organizing',
    title: '整理整頓で心もスッキリ',
    excerpt: 'シンプルな暮らしのためのお片付けのコツをご紹介します。物を減らすことで、本当に大切なものが見えてきます。',
    date: '2024-11-28',
    image: '/blog/organizing.jpg',
    category: 'インテリア',
  },
  {
    id: '3',
    slug: 'handmade-crafts',
    title: '手作りの温もりを暮らしに',
    excerpt: '職人の技が光る、こだわりのハンドメイドアイテム特集。一つひとつに込められた想いをお届けします。',
    date: '2024-11-25',
    image: '/blog/handmade.jpg',
    category: '特集',
  },
  {
    id: '4',
    slug: 'autumn-collection',
    title: '秋の新商品が入荷しました',
    excerpt: '温かみのあるカラーと上質な素材。秋を彩る新商品をご紹介します。',
    date: '2024-11-20',
    image: '/blog/autumn.jpg',
    category: '新商品',
  },
];

const categories = [
  { slug: 'all', name: 'All' },
  { slug: 'lifestyle', name: 'Lifestyle' },
  { slug: 'interior', name: 'Interior' },
  { slug: 'kitchen', name: 'Kitchen' },
];

export default async function BlogPage() {
  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-7xl mx-auto px-4 py-20">
        {/* ページヘッダー */}
        <header className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-black mb-4 tracking-tighter" style={{ fontFamily: 'var(--font-anton), sans-serif' }}>
            BLOG
          </h1>
          <p className="text-lg text-gray-600 font-bold uppercase tracking-wider">
            STORIES & INSIGHTS FROM SPIROM
          </p>
        </header>

        {/* カテゴリタブ */}
        <nav aria-label="ブログカテゴリ" className="mb-12">
          <ul className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <li key={category.slug}>
                <CategoryPill href={category.slug === 'all' ? '/blog' : `/blog?category=${category.slug}`}>
                  {category.name}
                </CategoryPill>
              </li>
            ))}
          </ul>
        </nav>

        {/* 記事一覧 */}
        <section aria-labelledby="articles-heading">
          <h2 id="articles-heading" className="sr-only">記事一覧</h2>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {posts.map((post) => (
              <li key={post.id}>
                <ContentCard
                  href={`/blog/${post.slug}`}
                  title={post.title}
                  description={post.excerpt}
                  image={post.image}
                  date={new Date(post.date).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                  category={post.category}
                />
              </li>
            ))}
          </ul>

          {/* ページネーション */}
          <nav aria-label="ページネーション" className="mt-16 flex justify-center gap-3">
            <button className="px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] opacity-50 cursor-not-allowed">
              PREV
            </button>
            <button className="w-12 h-12 font-black bg-black text-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              1
            </button>
            <button className="w-12 h-12 font-black bg-white text-black border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all">
              2
            </button>
            <button className="px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all">
              NEXT
            </button>
          </nav>
        </section>
      </div>
    </div>
  );
}
