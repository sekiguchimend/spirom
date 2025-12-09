import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PortableText } from "@portabletext/react";
import { 
  client, 
  postBySlugQuery, 
  postSlugsQuery, 
  relatedPostsQuery,
  urlFor, 
  Post,
  calculateReadingTime,
  formatDate
} from "@/lib/sanity";
import { ContentCard, Breadcrumb } from "@/components/ui";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ISR: 60秒ごとに再検証
export const revalidate = 60;

// SSG: ビルド時に主要な記事を生成
export async function generateStaticParams() {
  // Sanity未設定時は空配列を返す
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID === "dummy-project-id") {
    return [];
  }

  try {
    const posts = await client.fetch<{ slug: string }[]>(postSlugsQuery);
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

async function getPost(slug: string): Promise<Post | null> {
  try {
    console.log("Fetching post with slug:", slug);
    console.log("Query:", postBySlugQuery);
    const post = await client.fetch(postBySlugQuery, { slug });
    console.log("Fetched post:", post);
    return post;
  } catch (error) {
    console.error(`Failed to fetch post with slug "${slug}":`, error);
    return null;
  }
}

async function getRelatedPosts(slug: string, categorySlug: string, tags: string[] = []): Promise<Post[]> {
  try {
    return await client.fetch(relatedPostsQuery, { 
      slug, 
      categorySlug,
      tags 
    });
  } catch (error) {
    console.error("Failed to fetch related posts:", error);
    return [];
  }
}

// SEO用メタデータを動的に生成
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await getPost(decodedSlug);

  if (!post) {
    return {
      title: "記事が見つかりません",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://spirom.com";

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || `${post.title} - Spiromブログ`,
    alternates: {
      canonical: `${siteUrl}/blog/${slug}`,
    },
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || `${post.title} - Spiromブログ`,
      type: "article",
      publishedTime: post.publishedAt,
      authors: post.author ? [post.author.name] : undefined,
      url: `${siteUrl}/blog/${slug}`,
      images: post.mainImage
        ? [{
            url: urlFor(post.mainImage).width(1200).height(630).url(),
            width: 1200,
            height: 630,
            alt: post.title,
          }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || `${post.title} - Spiromブログ`,
      images: post.mainImage
        ? [urlFor(post.mainImage).width(1200).height(630).url()]
        : undefined,
    },
  };
}

// Portable Text用カスタムコンポーネント
interface ImageValue {
  asset?: { _ref: string };
  alt?: string;
  caption?: string;
}

interface CodeValue {
  language?: string;
  code?: string;
}

interface LinkValue {
  blank?: boolean;
  href?: string;
}

import type { ReactNode } from "react";

const portableTextComponents = {
  types: {
    image: ({ value }: { value: ImageValue }) => {
      if (!value?.asset) return null;
      return (
        <figure className="my-8">
          <Image
            src={urlFor(value).width(800).url()}
            alt={value.alt || "記事画像"}
            width={800}
            height={450}
            className="w-full rounded-lg"
          />
          {value.caption && (
            <figcaption className="text-sm text-gray-600 mt-2 text-center">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
    code: ({ value }: { value: CodeValue }) => {
      return (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
          <code className={`language-${value.language}`}>{value.code}</code>
        </pre>
      );
    },
  },
  marks: {
    link: ({ children, value }: { children: ReactNode; value?: LinkValue }) => {
      const target = value?.blank ? "_blank" : undefined;
      return (
        <a
          href={value?.href}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className="text-blue-600 underline hover:text-blue-800"
        >
          {children}
        </a>
      );
    },
  },
  block: {
    h1: ({ children }: { children?: ReactNode }) => <h1 className="text-4xl font-bold mt-8 mb-4">{children}</h1>,
    h2: ({ children }: { children?: ReactNode }) => <h2 className="text-3xl font-bold mt-8 mb-4">{children}</h2>,
    h3: ({ children }: { children?: ReactNode }) => <h3 className="text-2xl font-bold mt-6 mb-3">{children}</h3>,
    h4: ({ children }: { children?: ReactNode }) => <h4 className="text-xl font-bold mt-6 mb-3">{children}</h4>,
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 py-2 my-4 italic text-gray-700">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }: { children?: ReactNode }) => <ul className="list-disc list-inside my-4 space-y-2">{children}</ul>,
    number: ({ children }: { children?: ReactNode }) => <ol className="list-decimal list-inside my-4 space-y-2">{children}</ol>,
  },
};

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await getPost(decodedSlug);

  if (!post) {
    redirect("/blog");
  }

  const readingTime = calculateReadingTime(post.body);
  const relatedPosts = post.category
    ? await getRelatedPosts(
        slug,
        post.category.slug.current,
        post.tags || []
      )
    : [];

  return (
    <>
      <article className="min-h-screen bg-[#FFFFF5]">
        <div className="max-w-4xl mx-auto pt-24 sm:pt-16 pb-16 px-4">
          {/* パンくずリスト */}
          <Breadcrumb
            items={[
              { label: 'ホーム', href: '/' },
              { label: 'ブログ', href: '/blog' },
              { label: post.title },
            ]}
          />

          {/* 記事ヘッダー */}
          <header className="mb-8">
            {/* カテゴリバッジ */}
            {post.category && (
              <Link
                href={`/blog?category=${post.category.slug.current}`}
                className="inline-block px-4 py-2 text-sm font-bold uppercase tracking-wider bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all mb-4"
                style={{
                  backgroundColor: post.category.color || "#fff",
                  color: post.category.color ? "#fff" : "#000"
                }}
              >
                {post.category.title}
              </Link>
            )}

            {/* タイトル */}
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-wide text-black">
              {post.title}
            </h1>

            {/* メタ情報 */}
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
              {post.publishedAt && (
                <>
                  <time dateTime={post.publishedAt}>
                    {formatDate(post.publishedAt)}
                  </time>
                  <span>•</span>
                </>
              )}
              <span>{readingTime}分で読めます</span>
            </div>

            {/* 著者情報 */}
            {post.author && (
              <div className="flex items-center gap-4">
                {post.author.image && (
                  <Image
                    src={urlFor(post.author.image).width(64).height(64).url()}
                    alt={post.author.name}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                )}
                <div>
                  <p className="font-bold text-gray-900">
                    <Link href={`/blog?author=${post.author.slug?.current}`} className="hover:underline">
                      {post.author.name}
                    </Link>
                  </p>
                  {post.author.bio && (
                    <p className="text-sm text-gray-600">{post.author.bio}</p>
                  )}
                </div>
              </div>
            )}
          </header>

          {/* アイキャッチ画像 */}
          {post.mainImage && (
            <Image
              src={urlFor(post.mainImage).width(1200).height(675).url()}
              alt={post.title}
              width={1200}
              height={675}
              className="w-full rounded-lg mb-8"
              priority
            />
          )}

          {/* 記事本文 */}
          {post.body && (
            <div className="prose prose-lg max-w-none mb-12" style={{ color: "#323232" }}>
              <PortableText value={post.body} components={portableTextComponents} />
            </div>
          )}

          {/* タグ */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-12">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${tag}`}
                  className="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* SNS共有ボタン（オプション） */}
          {post.author?.socialLinks && (
            <div className="border-t border-gray-200 pt-8 mb-12">
              <h3 className="font-bold mb-4">著者をフォロー</h3>
              <div className="flex gap-4">
                {post.author.socialLinks.twitter && (
                  <a href={post.author.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    Twitter
                  </a>
                )}
                {post.author.socialLinks.instagram && (
                  <a href={post.author.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">
                    Instagram
                  </a>
                )}
                {post.author.socialLinks.linkedin && (
                  <a href={post.author.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                    LinkedIn
                  </a>
                )}
                {post.author.socialLinks.website && (
                  <a href={post.author.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:underline">
                    Website
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 関連記事 */}
        {relatedPosts.length > 0 && (
          <section className="bg-white py-16">
            <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-3xl font-black mb-8 tracking-wide text-black">関連記事</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedPosts.map((relatedPost) => (
                  <ContentCard
                    key={relatedPost._id}
                    href={`/blog/${relatedPost.slug.current}`}
                    title={relatedPost.title}
                    description={relatedPost.excerpt || ""}
                    image={relatedPost.mainImage ? urlFor(relatedPost.mainImage).width(600).height(400).url() : undefined}
                    date={relatedPost.publishedAt ? formatDate(relatedPost.publishedAt) : undefined}
                    category={relatedPost.category?.title}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>

      {/* JSON-LD 構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt || post.seoDescription,
            image: post.mainImage
              ? urlFor(post.mainImage).width(1200).height(630).url()
              : undefined,
            datePublished: post.publishedAt,
            dateModified: post.publishedAt,
            author: post.author
              ? {
                  "@type": "Person",
                  name: post.author.name,
                  url: post.author.socialLinks?.website,
                }
              : undefined,
            publisher: {
              "@type": "Organization",
              name: "Spirom",
              logo: {
                "@type": "ImageObject",
                url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://spirom.com"}/spirom.png`,
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${process.env.NEXT_PUBLIC_SITE_URL || "https://spirom.com"}/blog/${slug}`,
            },
          }),
        }}
      />
    </>
  );
}
