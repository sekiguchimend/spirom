import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 商品情報の型定義
export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  category_id: string | null;
  images: string[];
  stock: number;
  sku: string | null;
  weight: number | null;
  is_active: boolean;
  is_featured: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ===========================================
// 内部フェッチ関数（キャッシュなし）
// ===========================================

async function fetchFeaturedProducts(limit: number): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }

  return data || [];
}

async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all products:', error);
    return [];
  }

  return data || [];
}

async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching product by slug:', error);
    return null;
  }

  return data;
}

// ===========================================
// unstable_cache でビルド/リクエスト間キャッシュ
// revalidate: 60秒でキャッシュを更新
// ===========================================

const getCachedFeaturedProducts = unstable_cache(
  async (limit: number) => fetchFeaturedProducts(limit),
  ['featured-products'],
  { revalidate: 60, tags: ['products'] }
);

const getCachedAllProducts = unstable_cache(
  async () => fetchAllProducts(),
  ['all-products'],
  { revalidate: 60, tags: ['products'] }
);

const getCachedProductBySlug = unstable_cache(
  async (slug: string) => fetchProductBySlug(slug),
  ['product-by-slug'],
  { revalidate: 60, tags: ['products'] }
);

// ===========================================
// React.cache() でリクエスト内の重複排除
// 同じリクエスト内で複数回呼ばれても1回のみ実行
// ===========================================

export const getFeaturedProducts = cache(async (limit: number = 4): Promise<Product[]> => {
  return getCachedFeaturedProducts(limit);
});

export const getAllProducts = cache(async (): Promise<Product[]> => {
  return getCachedAllProducts();
});

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  return getCachedProductBySlug(slug);
});
