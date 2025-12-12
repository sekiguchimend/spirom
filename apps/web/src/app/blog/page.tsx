import { Metadata } from "next";
import { ContentCard, CategoryPill } from "@/components/ui";
import { getPosts, getCategories, urlFor, formatDate } from "@/lib/sanity";

export const metadata: Metadata = {
  title: "ブログ",
  description: "暮らしのヒントや商品の使い方、スタッフおすすめの情報をお届けするSpiromのブログです。",
  openGraph: {
    title: "ブログ | Spirom",
    description: "暮らしのヒントや商品の使い方をお届けします。",
  },
};

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([
    getPosts(),
    getCategories(),
  ]);

  // カテゴリフィルター用のナビゲーション項目
  const categoryItems = [
    { slug: "all", name: "All", postCount: posts.length },
    ...categories.map((cat) => ({
      slug: cat.slug.current,
      name: cat.title,
      postCount: cat.postCount,
    })),
  ];

  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-7xl mx-auto px-4 py-20">
        {/* ページヘッダー */}
        <header className="text-center mb-16" aria-labelledby="page-title">
          <h1 id="page-title" className="text-6xl md:text-7xl font-black mb-4 tracking-wide text-black" style={{ fontFamily: 'var(--font-anton), sans-serif' }}>
            BLOG
          </h1>
          <p className="text-lg text-gray-600 font-bold uppercase tracking-wider">
            STORIES & INSIGHTS FROM SPIROM
          </p>
        </header>

        {/* カテゴリタブ */}
        {categoryItems.length > 1 && (
          <nav aria-label="ブログカテゴリ" className="mb-12">
            <ul className="flex flex-wrap justify-center gap-3">
              {categoryItems.map((category) => (
                <li key={category.slug}>
                  <CategoryPill 
                    href={category.slug === 'all' ? '/blog' : `/blog?category=${category.slug}`}
                  >
                    {category.name} ({category.postCount})
                  </CategoryPill>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* 記事一覧 */}
        <section aria-labelledby="articles-heading">
          <h2 id="articles-heading" className="sr-only">記事一覧</h2>

          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl text-gray-600">
                まだブログ記事がありません。
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Sanity Studioで記事を作成してください。
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <li key={post._id}>
                  <ContentCard
                    href={`/blog/${post.slug.current}`}
                    title={post.title}
                    description={post.excerpt || ""}
                    image={post.mainImage ? urlFor(post.mainImage).width(800).height(450).url() : undefined}
                    date={post.publishedAt ? formatDate(post.publishedAt) : undefined}
                    category={post.category?.title}
                  />
                </li>
              ))}
            </ul>
          )}

          {/* TODO: ページネーション実装 */}
          {posts.length > 10 && (
            <nav aria-label="ページネーション" className="mt-16 flex justify-center gap-3">
              <button className="px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] opacity-50 cursor-not-allowed">
                PREV
              </button>
              <button className="w-12 h-12 font-black bg-black text-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                1
              </button>
              <button className="w-12 h-12 font-black bg-white text-black border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200">
                2
              </button>
              <button className="px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200">
                NEXT
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
