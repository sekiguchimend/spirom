import { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import { client, postBySlugQuery, postSlugsQuery, urlFor, Post } from "@/lib/sanity";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ISR: 60秒ごとに再検証
export const revalidate = 60;

// SSG: ビルド時に主要な記事を生成
export async function generateStaticParams() {
  const posts = await client.fetch<{ slug: string }[]>(postSlugsQuery);
  return posts.map((post) => ({ slug: post.slug }));
}

async function getPost(slug: string): Promise<Post | null> {
  return await client.fetch(postBySlugQuery, { slug });
}

// SEO用メタデータを動的に生成
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "記事が見つかりません",
    };
  }

  const author =
    typeof post.author === "object" && post.author !== null
      ? post.author.name
      : post.author;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://spirom.com";

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || `${post.title} - Spiromブログ`,
    alternates: {
      canonical: `${siteUrl}/blog/${slug}`,
    },
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDescription || `${post.title} - Spiromブログ`,
      type: "article",
      publishedTime: post.publishedAt,
      authors: author ? [author] : undefined,
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
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const author =
    typeof post.author === "object" && post.author !== null
      ? post.author.name
      : post.author;

  return (
    <div style={{ backgroundColor: "#fff", minHeight: "100vh" }}>
      <main className="max-w-3xl mx-auto py-16 px-8">
        <article>
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4" style={{ color: "#323232" }}>
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm" style={{ color: "#323232" }}>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString("ja-JP")}
              </time>
              {author && <span>著者: {author}</span>}
            </div>
          </header>

          {post.mainImage && (
            <Image
              src={urlFor(post.mainImage).width(800).height(400).url()}
              alt={post.title}
              width={800}
              height={400}
              className="w-full rounded-lg mb-8"
              priority
            />
          )}

          {post.body && (
            <div className="prose prose-lg max-w-none" style={{ color: "#323232" }}>
              <PortableText value={post.body} />
            </div>
          )}
        </article>
      </main>

      {/* JSON-LD 構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            image: post.mainImage
              ? urlFor(post.mainImage).width(1200).height(630).url()
              : undefined,
            datePublished: post.publishedAt,
            dateModified: post.publishedAt,
            author: author
              ? {
                  "@type": "Person",
                  name: author,
                }
              : undefined,
          }),
        }}
      />
    </div>
  );
}
