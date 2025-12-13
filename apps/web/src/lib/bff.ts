import { BFF_BASE_URL } from './config';

interface RequestOptions {
  revalidate?: number | false;
  tags?: string[];
}

async function fetchBff<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BFF_BASE_URL}${path}`;

  const fetchOptions: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    headers: {
      'Accept': 'application/json',
    },
  };

  if (options.revalidate !== undefined || options.tags) {
    fetchOptions.next = {};
    if (options.revalidate !== undefined) {
      fetchOptions.next.revalidate = options.revalidate;
    }
    if (options.tags) {
      fetchOptions.next.tags = options.tags;
    }
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`BFF request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Types
export interface ProductImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  currency: string;
  images: ProductImage[];
  category_id: string;
  category_name: string;
  stock_quantity: number;
  is_available: boolean;
  attributes: ProductAttribute[];
  created_at: string;
  updated_at: string;
}

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  compare_at_price?: number;
  currency: string;
  image?: ProductImage;
  category_name: string;
  is_available: boolean;
}

export interface Breadcrumb {
  name: string;
  url: string;
}

export interface MetaData {
  title: string;
  description: string;
  canonical: string;
  og_image?: string;
  og_type: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  sort_order: number;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface BlogImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface BlogAuthor {
  id: string;
  name: string;
  slug: string;
  image?: string;
  bio?: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  featured_image?: BlogImage;
  author: BlogAuthor;
  category?: BlogCategory;
  tags: string[];
  published_at: string;
  updated_at: string;
  reading_time: number;
}

export interface BlogListItem {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  featured_image?: BlogImage;
  author: BlogAuthor;
  published_at: string;
  reading_time: number;
}

export interface HeroSection {
  title: string;
  subtitle?: string;
  image_url: string;
  cta_text: string;
  cta_url: string;
}

// Response Types
export interface HomePageResponse {
  hero: HeroSection;
  featured_products: ProductListItem[];
  new_arrivals: ProductListItem[];
  categories: Category[];
  latest_posts: BlogListItem[];
  json_ld: string;
  meta: MetaData;
}

export interface ProductDetailResponse {
  product: Product;
  related_products: ProductListItem[];
  breadcrumbs: Breadcrumb[];
  json_ld: string;
  meta: MetaData;
}

export interface CategoryPageResponse {
  category: Category;
  products: ProductListItem[];
  pagination: Pagination;
  breadcrumbs: Breadcrumb[];
  subcategories: Category[];
  json_ld: string;
  meta: MetaData;
}

export interface BlogDetailResponse {
  post: BlogPost;
  related_posts: BlogListItem[];
  breadcrumbs: Breadcrumb[];
  json_ld: string;
  meta: MetaData;
}

export interface SearchFacets {
  categories: { id: string; name: string; count: number }[];
  price_ranges: { min: number; max: number; count: number }[];
}

export interface SearchResponse {
  products: ProductListItem[];
  pagination: Pagination;
  facets: SearchFacets;
  meta: MetaData;
}

// BFF API Functions
export async function getHomePage(): Promise<HomePageResponse> {
  return fetchBff<HomePageResponse>('/bff/v1/home', {
    revalidate: 300,
    tags: ['home'],
  });
}

export async function getProductDetail(slug: string): Promise<ProductDetailResponse> {
  return fetchBff<ProductDetailResponse>(`/bff/v1/products/${slug}`, {
    revalidate: 60,
    tags: ['product', `product-${slug}`],
  });
}

export async function getCategoryPage(
  slug: string,
  page: number = 1,
  perPage: number = 20
): Promise<CategoryPageResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  return fetchBff<CategoryPageResponse>(`/bff/v1/categories/${slug}?${params}`, {
    revalidate: 300,
    tags: ['category', `category-${slug}`],
  });
}

export async function getBlogDetail(slug: string): Promise<BlogDetailResponse> {
  return fetchBff<BlogDetailResponse>(`/bff/v1/blog/${slug}`, {
    revalidate: 60,
    tags: ['blog', `blog-${slug}`],
  });
}

export async function searchProducts(params: {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'popular';
  page?: number;
  perPage?: number;
}): Promise<SearchResponse> {
  const searchParams = new URLSearchParams({ q: params.query });

  if (params.category) searchParams.set('category', params.category);
  if (params.minPrice !== undefined) searchParams.set('min_price', params.minPrice.toString());
  if (params.maxPrice !== undefined) searchParams.set('max_price', params.maxPrice.toString());
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.perPage) searchParams.set('per_page', params.perPage.toString());

  return fetchBff<SearchResponse>(`/bff/v1/search?${searchParams}`, {
    revalidate: 30,
    tags: ['search'],
  });
}

// Format helpers - re-exported from utils.ts for backwards compatibility
export { formatPrice, formatDate } from './utils';

/**
 * BFF用の価格フォーマット（100で割る - Stripeセント単位用）
 */
export function formatPriceFromCents(price: number, currency: string = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price / 100);
}
