import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// カテゴリ情報の型定義
export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  product_count: number;
  created_at: string;
  updated_at: string;
}

// 商品バリアント（サイズ）の型定義
export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  sku?: string;
  stock: number;
  price_adjustment: number;
  sort_order: number;
  is_active: boolean;
  body_length?: number;
  body_width?: number;
  shoulder_width?: number;
  sleeve_length?: number;
}

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
  variants?: ProductVariant[];
  material?: string | null;
  material_detail?: string | null;
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

async function fetchProductsByCategory(categorySlug: string): Promise<Product[]> {
  // まずカテゴリIDを取得
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .eq('is_active', true)
    .single();

  if (categoryError || !category) {
    console.error('Error fetching category:', categoryError);
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .eq('category_id', category.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }

  return data || [];
}

async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variants (
        id,
        product_id,
        size,
        sku,
        stock,
        price_adjustment,
        sort_order,
        is_active,
        body_length,
        body_width,
        shoulder_width,
        sleeve_length
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching product by slug:', error);
    return null;
  }

  // product_variantsをvariantsにマッピング（アクティブなもののみ、sort_order順）
  if (data && data.product_variants) {
    const activeVariants = (data.product_variants as ProductVariant[])
      .filter(v => v.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
    return {
      ...data,
      variants: activeVariants,
      product_variants: undefined,
    } as Product;
  }

  return data;
}

async function fetchTopLevelCategories(limit: number): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .is('parent_id', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
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

const getCachedProductsByCategory = unstable_cache(
  async (categorySlug: string) => fetchProductsByCategory(categorySlug),
  ['products-by-category'],
  { revalidate: 60, tags: ['products'] }
);

const getCachedProductBySlug = unstable_cache(
  async (slug: string) => fetchProductBySlug(slug),
  ['product-by-slug'],
  { revalidate: 60, tags: ['products'] }
);

const getCachedTopLevelCategories = unstable_cache(
  async (limit: number) => fetchTopLevelCategories(limit),
  ['top-level-categories'],
  { revalidate: 300, tags: ['categories'] }
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

export const getProductsByCategory = cache(async (categorySlug: string): Promise<Product[]> => {
  return getCachedProductsByCategory(categorySlug);
});

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  return getCachedProductBySlug(slug);
});

export const getTopLevelCategories = cache(async (limit: number = 12): Promise<Category[]> => {
  return getCachedTopLevelCategories(limit);
});
