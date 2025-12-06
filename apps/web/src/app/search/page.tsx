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
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-7xl mx-auto px-4 py-20">
        {/* ページヘッダー */}
        <header className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-black mb-4 tracking-tighter" style={{ fontFamily: 'var(--font-anton), sans-serif' }}>
            SEARCH
          </h1>
          <p className="text-lg text-gray-600 font-bold uppercase tracking-wider">
            {query ? `RESULTS FOR "${query.toUpperCase()}"` : 'FIND YOUR PERFECT ITEM'}
          </p>
        </header>

        {/* Sort Options */}
        {results && results.products.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 bg-white border-4 border-black rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <span className="font-bold uppercase tracking-wider">
              {results.pagination.total} ITEMS FOUND
            </span>
            <div className="flex items-center gap-3">
              <span className="font-bold uppercase tracking-wider text-sm">SORT:</span>
              <select
                value={sort || 'relevance'}
                onChange={(e) => updateParams('sort', e.target.value)}
                className="px-4 py-2 bg-white border-3 border-black rounded-lg font-bold text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
              >
                <option value="relevance">Relevance</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="popular">Popular</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Facets Sidebar */}
          {results && results.facets && (
            <aside className="lg:w-64 flex-shrink-0">
              <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] sticky top-28">
                {/* Category Facets */}
                {results.facets.categories.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-black text-lg uppercase tracking-tight mb-4 pb-2 border-b-3 border-black">
                      CATEGORIES
                    </h3>
                    <ul className="space-y-2">
                      <li>
                        <button
                          onClick={() => updateParams('category', null)}
                          className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${!category ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                        >
                          All Categories
                        </button>
                      </li>
                      {results.facets.categories.map((facet) => (
                        <li key={facet.id}>
                          <button
                            onClick={() => updateParams('category', facet.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all flex justify-between items-center ${category === facet.id ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                          >
                            <span>{facet.name}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${category === facet.id ? 'bg-white text-black' : 'bg-gray-200'}`}>
                              {facet.count}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Price Range Facets */}
                {results.facets.price_ranges.length > 0 && (
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-tight mb-4 pb-2 border-b-3 border-black">
                      PRICE RANGE
                    </h3>
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
                            className="w-full text-left px-3 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition-all flex justify-between items-center"
                          >
                            <span>{formatPrice(range.min)} - {formatPrice(range.max)}</span>
                            <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">
                              {range.count}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* Results */}
          <main className="flex-1">
            {loading && (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-white border-4 border-black rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                </div>
                <p className="font-bold uppercase tracking-wider text-gray-500">SEARCHING...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-16">
                <div className="bg-[#ff2d78] border-4 border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] inline-block">
                  <p className="font-black text-white uppercase tracking-wider">{error}</p>
                </div>
              </div>
            )}

            {!loading && !error && query && results && results.products.length === 0 && (
              <div className="text-center py-16">
                <div className="w-32 h-32 mx-auto mb-8 bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.3-4.3"/>
                    <path d="M8 11h6"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-black mb-4 uppercase tracking-tight">NO RESULTS FOUND</h2>
                <p className="text-gray-600 mb-8">
                  「{query}」に一致する商品が見つかりませんでした
                </p>
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-black uppercase tracking-wider bg-black text-white border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
                >
                  BROWSE ALL PRODUCTS
                </Link>
              </div>
            )}

            {!loading && results && results.products.length > 0 && (
              <>
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-12">
                  {results.products.map((product: ProductListItem) => (
                    <li key={product.id}>
                      <Link
                        href={`/products/${product.slug}`}
                        className="group block bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
                      >
                        <figure className="aspect-square relative bg-gray-100 border-b-4 border-black overflow-hidden">
                          {product.image && (
                            <Image
                              src={product.image.url}
                              alt={product.image.alt}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="(max-width: 768px) 50vw, 33vw"
                            />
                          )}
                        </figure>
                        <div className="p-4">
                          <h3 className="font-black text-sm md:text-base uppercase tracking-tight line-clamp-2 group-hover:text-[#ff2d78] transition-colors">
                            {product.name}
                          </h3>
                          <p className="font-black text-lg mt-2">
                            {formatPrice(product.price, product.currency)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Pagination */}
                {results.pagination.total_pages > 1 && (
                  <nav aria-label="ページネーション" className="flex justify-center gap-3">
                    <button
                      onClick={() => updateParams('page', (page - 1).toString())}
                      disabled={!results.pagination.has_prev}
                      className={`px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${results.pagination.has_prev ? 'hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all' : 'opacity-50 cursor-not-allowed'}`}
                    >
                      PREV
                    </button>
                    <span className="flex items-center px-4 font-black">
                      {page} / {results.pagination.total_pages}
                    </span>
                    <button
                      onClick={() => updateParams('page', (page + 1).toString())}
                      disabled={!results.pagination.has_next}
                      className={`px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${results.pagination.has_next ? 'hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all' : 'opacity-50 cursor-not-allowed'}`}
                    >
                      NEXT
                    </button>
                  </nav>
                )}
              </>
            )}

            {!query && (
              <div className="text-center py-16">
                <div className="w-32 h-32 mx-auto mb-8 bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.3-4.3"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-black mb-4 uppercase tracking-tight">WHAT ARE YOU LOOKING FOR?</h2>
                <p className="text-gray-600 mb-8">
                  検索キーワードを入力してください
                </p>
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-black uppercase tracking-wider bg-black text-white border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
                >
                  BROWSE ALL PRODUCTS
                </Link>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
