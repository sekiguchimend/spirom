import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  queryParam?: string;
}

export function Pagination({ currentPage, totalPages, baseUrl, queryParam = 'page' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const buildUrl = (page: number) => {
    const url = new URL(baseUrl, 'http://localhost');
    url.searchParams.set(queryParam, page.toString());
    return `${url.pathname}${url.search}`;
  };

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav aria-label="ページネーション" className="mt-16 flex justify-center gap-3">
      {hasPrev ? (
        <Link
          href={buildUrl(currentPage - 1)}
          className="px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200"
        >
          PREV
        </Link>
      ) : (
        <span className="px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] opacity-50 cursor-not-allowed">
          PREV
        </span>
      )}

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <Link
          key={page}
          href={buildUrl(page)}
          className={`w-12 h-12 font-black border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center ${
            page === currentPage
              ? 'bg-black text-white'
              : 'bg-white text-black hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200'
          }`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </Link>
      ))}

      {hasNext ? (
        <Link
          href={buildUrl(currentPage + 1)}
          className="px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200"
        >
          NEXT
        </Link>
      ) : (
        <span className="px-6 py-3 font-black text-sm uppercase tracking-wider bg-white border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] opacity-50 cursor-not-allowed">
          NEXT
        </span>
      )}
    </nav>
  );
}
