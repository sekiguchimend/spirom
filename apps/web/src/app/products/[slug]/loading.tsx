export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <article className="grid grid-cols-1 lg:grid-cols-2">
        <div className="lg:sticky lg:top-0 lg:h-screen bg-[#FAFAFA] flex items-center justify-center p-8 lg:p-16">
          <div className="relative w-full max-w-lg animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-2xl" />
          </div>
        </div>
        <div className="px-6 py-12 lg:px-16 lg:py-20 flex flex-col justify-center bg-[#4a7c59] rounded-bl-[80px]">
          <div className="max-w-md animate-pulse">
            <div className="h-4 bg-white/30 rounded w-20 mb-4" />
            <div className="h-12 bg-white/30 rounded w-3/4 mb-6" />
            <div className="h-10 bg-white/30 rounded w-1/3 mb-8" />
            <div className="space-y-2 mb-10">
              <div className="h-4 bg-white/30 rounded w-full" />
              <div className="h-4 bg-white/30 rounded w-5/6" />
              <div className="h-4 bg-white/30 rounded w-4/6" />
            </div>
            <div className="h-14 bg-white/30 rounded-xl w-full" />
          </div>
        </div>
      </article>
    </div>
  );
}
