import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { unstable_cache } from "next/cache";
import { cache } from "react";

// Sanity client（projectIdが設定されていない場合はダミー値を使用）
export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "dummy-project-id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: true,
  token: process.env.SANITY_API_TOKEN, // プレビュー用（オプション）
});

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

// GROQ Queries
export const postsQuery = `*[_type == "post" && (publishedAt < now() || !defined(publishedAt))] | order(publishedAt desc) {
  _id,
  title,
  slug,
  mainImage,
  excerpt,
  publishedAt,
  featured,
  "author": author->{name, slug, image},
  "category": category->{title, slug, color},
  tags,
  seoTitle,
  seoDescription
}`;

export const featuredPostsQuery = `*[_type == "post" && publishedAt < now() && featured == true] | order(publishedAt desc) [0...3] {
  _id,
  title,
  slug,
  mainImage,
  excerpt,
  publishedAt,
  "author": author->{name, slug, image},
  "category": category->{title, slug, color},
  tags,
  seoTitle,
  seoDescription
}`;

export const postsByCategoryQuery = `*[_type == "post" && publishedAt < now() && category->slug.current == $categorySlug] | order(publishedAt desc) {
  _id,
  title,
  slug,
  mainImage,
  excerpt,
  publishedAt,
  "author": author->{name, slug, image},
  "category": category->{title, slug, color},
  tags,
  seoTitle,
  seoDescription
}`;

export const postBySlugQuery = `*[_type == "post" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  mainImage,
  excerpt,
  publishedAt,
  featured,
  "author": author->{name, slug, image, bio, socialLinks},
  "category": category->{title, slug, color, description},
  body,
  tags,
  seoTitle,
  seoDescription
}`;

export const postSlugsQuery = `*[_type == "post" && publishedAt < now()] {
  "slug": slug.current
}`;

export const categoriesQuery = `*[_type == "category"] | order(sortOrder asc) {
  _id,
  title,
  slug,
  description,
  color,
  sortOrder,
  "postCount": count(*[_type == "post" && references(^._id)])
}`;

export const relatedPostsQuery = `*[_type == "post" && slug.current != $slug && (category->slug.current == $categorySlug || count((tags[])[@ in $tags]) > 0)] | order(publishedAt desc) [0...3] {
  _id,
  title,
  slug,
  mainImage,
  excerpt,
  publishedAt,
  "author": author->{name, slug, image},
  "category": category->{title, slug, color}
}`;

// Types
import type { PortableTextBlock } from "@portabletext/types";

export interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  mainImage?: SanityImageSource;
  excerpt?: string;
  publishedAt?: string;
  featured?: boolean;
  author?: {
    name: string;
    slug?: { current: string };
    image?: SanityImageSource;
    bio?: string;
    socialLinks?: {
      twitter?: string;
      instagram?: string;
      linkedin?: string;
      website?: string;
    };
  };
  category?: {
    title: string;
    slug: { current: string };
    color?: string;
    description?: string;
  };
  body?: PortableTextBlock[];
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface Category {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  color?: string;
  sortOrder: number;
  postCount: number;
}

// ===========================================
// キャッシュ付きデータ取得関数
// ===========================================

const getCachedPosts = unstable_cache(
  async () => client.fetch<Post[]>(postsQuery),
  ["sanity-posts"],
  { revalidate: 60, tags: ["posts"] }
);

const getCachedCategories = unstable_cache(
  async () => client.fetch<Category[]>(categoriesQuery),
  ["sanity-categories"],
  { revalidate: 60, tags: ["categories"] }
);

const getCachedPostBySlug = unstable_cache(
  async (slug: string) => client.fetch<Post | null>(postBySlugQuery, { slug }),
  ["sanity-post-by-slug"],
  { revalidate: 60, tags: ["posts"] }
);

const getCachedFeaturedPosts = unstable_cache(
  async () => client.fetch<Post[]>(featuredPostsQuery),
  ["sanity-featured-posts"],
  { revalidate: 60, tags: ["posts"] }
);

const getCachedRelatedPosts = unstable_cache(
  async (slug: string, categorySlug: string, tags: string[]) =>
    client.fetch<Post[]>(relatedPostsQuery, { slug, categorySlug, tags }),
  ["sanity-related-posts"],
  { revalidate: 60, tags: ["posts"] }
);

// React.cache()でリクエスト内重複排除
export const getPosts = cache(async (): Promise<Post[]> => {
  try {
    return await getCachedPosts();
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return [];
  }
});

export const getCategories = cache(async (): Promise<Category[]> => {
  try {
    return await getCachedCategories();
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
});

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  try {
    return await getCachedPostBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return null;
  }
});

export const getFeaturedPosts = cache(async (): Promise<Post[]> => {
  try {
    return await getCachedFeaturedPosts();
  } catch (error) {
    console.error("Failed to fetch featured posts:", error);
    return [];
  }
});

export const getRelatedPosts = cache(
  async (slug: string, categorySlug: string, tags: string[]): Promise<Post[]> => {
    try {
      return await getCachedRelatedPosts(slug, categorySlug, tags);
    } catch (error) {
      console.error("Failed to fetch related posts:", error);
      return [];
    }
  }
);

// ヘルパー関数
export function calculateReadingTime(body?: PortableTextBlock[]): number {
  if (!body) return 1;

  const text = body
    .filter((block) => block._type === "block")
    .map((block) => {
      const children = (block as { children?: Array<{ text?: string }> }).children;
      return children?.map((child) => child.text || "").join("") || "";
    })
    .join(" ");

  // 日本語と英語の混在を考慮（平均400文字/分）
  const wordsPerMinute = 400;
  const minutes = Math.ceil(text.length / wordsPerMinute);
  return Math.max(1, minutes);
}

export function formatDate(dateString: string, locale: string = "ja-JP"): string {
  return new Date(dateString).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
