import { MetadataRoute } from "next";
import { client, postSlugsQuery } from "@/lib/sanity";
import { supabase } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://spirom.com";

  // 静的ページ
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
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
        url: `${baseUrl}/products/${product.slug}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // Supabase未設定時はスキップ
  }

  // ブログ記事ページ（Sanity接続時のみ）
  let blogPages: MetadataRoute.Sitemap = [];

  try {
    if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
      const posts = await client.fetch<{ slug: string }[]>(postSlugsQuery);
      blogPages = posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // Sanity未設定時はスキップ
  }

  return [...staticPages, ...productPages, ...blogPages];
}
