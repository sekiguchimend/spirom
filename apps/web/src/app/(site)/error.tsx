'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-black mb-4">500</h1>
      <p className="text-xl text-gray-600 mb-8">エラーが発生しました</p>
      <button
        onClick={() => reset()}
        className="bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition-colors"
      >
        もう一度試す
      </button>
    </div>
  );
}
