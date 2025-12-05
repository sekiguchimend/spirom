'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { searchProducts, formatPrice, type SearchResponse, type ProductListItem } from '@/lib/bff';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || undefined;
  const sort = (searchParams.get('sort') as 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'popular') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async () => {
    if (!query) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await searchProducts({
        query,
        category,
        sort,
        page,
        perPage: 20,
      });
      setResults(data);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, category, sort, page]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const updateParams = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') {
      params.delete('page');
    }
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      <h1 className="text-3xl font-bold mb-8" style={{ color: '#323232' }}>
        {query ? `Search results for "${query}"` : 'Search'}
      </h1>

      {/* Sort Options */}
      {results && results.products.length > 0 && (
        <div className="flex items-center gap-4 mb-8">
          <span style={{ color: '#666' }}>Sort by:</span>
          <select
            value={sort || 'relevance'}
            onChange={(e) => updateParams('sort', e.target.value)}
            className="px-4 py-2 border"
            style={{ borderColor: '#ddd', color: '#323232' }}
          >
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popular">Popular</option>
          </select>
        </div>
      )}

      <div className="flex gap-8">
        {/* Facets Sidebar */}
        {results && results.facets && (
          <aside className="w-64 flex-shrink-0">
            {/* Category Facets */}
            {results.facets.categories.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3" style={{ color: '#323232' }}>Categories</h3>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => updateParams('category', null)}
                      className={`text-sm ${!category ? 'font-semibold' : ''}`}
                      style={{ color: '#323232' }}
                    >
                      All Categories
                    </button>
                  </li>
                  {results.facets.categories.map((facet) => (
                    <li key={facet.id}>
                      <button
                        onClick={() => updateParams('category', facet.id)}
                        className={`text-sm ${category === facet.id ? 'font-semibold' : ''}`}
                        style={{ color: '#323232' }}
                      >
                        {facet.name} ({facet.count})
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Price Range Facets */}
            {results.facets.price_ranges.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3" style={{ color: '#323232' }}>Price Range</h3>
                <ul className="space-y-2">
                  {results.facets.price_ranges.map((range, index) => (
                    <li key={index}>
                      <button
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString());
                          params.set('min_price', range.min.toString());
                          params.set('max_price', range.max.toString());
                          params.delete('page');
                          router.push(`/search?${params.toString()}`);
                        }}
                        className="text-sm"
                        style={{ color: '#323232' }}
                      >
                        {formatPrice(range.min)} - {formatPrice(range.max)} ({range.count})
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}

        {/* Results */}
        <main className="flex-1">
          {loading && (
            <div className="text-center py-12">
              <p style={{ color: '#666' }}>Searching...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p style={{ color: '#dc2626' }}>{error}</p>
            </div>
          )}

          {!loading && !error && query && results && results.products.length === 0 && (
            <div className="text-center py-12">
              <p style={{ color: '#666' }}>No products found for &quot;{query}&quot;</p>
            </div>
          )}

          {!loading && results && results.products.length > 0 && (
            <>
              <p className="mb-6" style={{ color: '#666' }}>
                {results.pagination.total} products found
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {results.products.map((product: ProductListItem) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="group"
                  >
                    <div className="aspect-square relative overflow-hidden mb-3" style={{ backgroundColor: '#f5f5f5' }}>
                      {product.image && (
                        <Image
                          src={product.image.url}
                          alt={product.image.alt}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                    </div>
                    <h3 className="font-medium group-hover:underline" style={{ color: '#323232' }}>
                      {product.name}
                    </h3>
                    <p style={{ color: '#666' }}>{formatPrice(product.price, product.currency)}</p>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {results.pagination.total_pages > 1 && (
                <nav className="flex justify-center space-x-2">
                  {results.pagination.has_prev && (
                    <button
                      onClick={() => updateParams('page', (page - 1).toString())}
                      className="px-4 py-2 border transition"
                      style={{ borderColor: '#ddd', color: '#323232' }}
                    >
                      Previous
                    </button>
                  )}

                  <span className="px-4 py-2" style={{ color: '#666' }}>
                    Page {page} of {results.pagination.total_pages}
                  </span>

                  {results.pagination.has_next && (
                    <button
                      onClick={() => updateParams('page', (page + 1).toString())}
                      className="px-4 py-2 border transition"
                      style={{ borderColor: '#ddd', color: '#323232' }}
                    >
                      Next
                    </button>
                  )}
                </nav>
              )}
            </>
          )}

          {!query && (
            <div className="text-center py-12">
              <p style={{ color: '#666' }}>Enter a search term to find products</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
