import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getCategoryPage, formatPrice } from '@/lib/bff';
import type { Metadata } from 'next';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const data = await getCategoryPage(slug);

    return {
      title: data.meta.title,
      description: data.meta.description,
      openGraph: {
        title: data.meta.title,
        description: data.meta.description,
        url: data.meta.canonical,
        images: data.meta.og_image ? [data.meta.og_image] : [],
        type: 'website',
      },
    };
  } catch {
    return {
      title: 'Category Not Found',
    };
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const { page } = await searchParams;
  const currentPage = parseInt(page || '1', 10);

  let data;
  try {
    data = await getCategoryPage(slug, currentPage);
  } catch {
    notFound();
  }

  const { category, products, pagination, breadcrumbs, subcategories, json_ld } = data;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: json_ld }}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-8" aria-label="パンくずリスト">
          <ol className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.url} className="flex items-center">
                {index > 0 && <span className="mx-2 text-gray-400">/</span>}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-gray-600">{crumb.name}</span>
                ) : (
                  <Link href={crumb.url} className="text-gray-900 hover:underline">
                    {crumb.name}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Category Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{category.name}</h1>
          {category.description && (
            <p className="text-gray-600">{category.description}</p>
          )}
        </header>

        {/* Subcategories */}
        {subcategories.length > 0 && (
          <nav className="mb-8" aria-labelledby="subcategories-heading">
            <h2 id="subcategories-heading" className="text-lg font-semibold mb-4">Subcategories</h2>
            <ul className="flex flex-wrap gap-2">
              {subcategories.map((sub) => (
                <li key={sub.id}>
                  <Link
                    href={`/categories/${sub.slug}`}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 transition inline-block"
                  >
                    {sub.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Products Grid */}
        <section aria-labelledby="products-heading">
          <h2 id="products-heading" className="sr-only">商品一覧</h2>
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/products/${product.slug}`}
                  className="group block"
                >
                  <figure className="aspect-square relative overflow-hidden bg-gray-100 mb-3">
                    {product.image && (
                      <Image
                        src={product.image.url}
                        alt={product.image.alt}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </figure>
                  <h3 className="font-medium group-hover:underline">{product.name}</h3>
                  <p className="text-gray-600">{formatPrice(product.price, product.currency)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <nav className="flex justify-center space-x-2" aria-label="ページネーション">
            {pagination.has_prev && (
              <Link
                href={`/categories/${slug}?page=${currentPage - 1}`}
                className="px-4 py-2 border hover:bg-gray-100 transition"
              >
                Previous
              </Link>
            )}

            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((pageNum) => (
              <Link
                key={pageNum}
                href={`/categories/${slug}?page=${pageNum}`}
                className={`px-4 py-2 border transition ${
                  pageNum === currentPage
                    ? 'bg-black text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                {pageNum}
              </Link>
            ))}

            {pagination.has_next && (
              <Link
                href={`/categories/${slug}?page=${currentPage + 1}`}
                className="px-4 py-2 border hover:bg-gray-100 transition"
              >
                Next
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
