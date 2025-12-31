import { MetadataRoute } from "next";
import { client, postSlugsQuery } from "@/lib/sanity";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  // 静的ページ
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // 商品ページ（Supabase接続時のみ）
  let productPages: MetadataRoute.Sitemap = [];

  try {
    const { data: products } = await supabase
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true);

    if (products) {
      productPages = products.map((product) => ({
        url: `${SITE_URL}/products/${product.slug}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // Supabase未設定時はスキップ
  }

  // カテゴリページ
  let categoryPages: MetadataRoute.Sitemap = [];

  try {
    const { data: categories } = await supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true);

    if (categories) {
      categoryPages = categories.map((category) => ({
        url: `${SITE_URL}/products?category=${category.slug}`,
        lastModified: new Date(category.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Supabase未設定時はスキップ
  }

  // ブログ記事ページ（Sanity接続時のみ）
  let blogPages: MetadataRoute.Sitemap = [];

  try {
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    if (projectId && projectId !== "dummy-project-id") {
      const posts = await client.fetch<{ slug: string }[]>(postSlugsQuery);
      blogPages = posts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // Sanity未設定時はスキップ
  }

  return [...staticPages, ...productPages, ...categoryPages, ...blogPages];
}
