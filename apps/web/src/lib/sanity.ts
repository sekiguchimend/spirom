import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: true,
});

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

// GROQ Queries
export const postsQuery = `*[_type == "post" && publishedAt < now()] | order(publishedAt desc) {
  _id,
  title,
  slug,
  mainImage,
  publishedAt,
  "author": author->name,
  "category": category->title,
  seoTitle,
  seoDescription
}`;

export const postBySlugQuery = `*[_type == "post" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  mainImage,
  publishedAt,
  "author": author->{name, image},
  "category": category->{title, slug},
  body,
  seoTitle,
  seoDescription
}`;

export const postSlugsQuery = `*[_type == "post" && publishedAt < now()] {
  "slug": slug.current
}`;

// Types
export interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  mainImage: SanityImageSource;
  publishedAt: string;
  author: string | { name: string; image?: SanityImageSource };
  category: string | { title: string; slug: { current: string } };
  body?: unknown[];
  seoTitle?: string;
  seoDescription?: string;
}
