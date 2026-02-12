export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-bg-cream">
      <div className="max-w-7xl mx-auto px-4 py-20">
        <header className="text-center mb-16 animate-pulse">
          <div className="h-16 bg-gray-200 rounded-lg w-64 mx-auto mb-4" />
          <div className="h-6 bg-gray-200 rounded w-40 mx-auto" />
        </header>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-2xl mb-3" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-5 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
