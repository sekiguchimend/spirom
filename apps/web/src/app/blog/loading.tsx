export default function BlogLoading() {
  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-7xl mx-auto px-4 py-20">
        <header className="text-center mb-16 animate-pulse">
          <div className="h-16 bg-gray-200 rounded-lg w-48 mx-auto mb-4" />
          <div className="h-6 bg-gray-200 rounded w-64 mx-auto" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200 rounded-2xl mb-4" />
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
