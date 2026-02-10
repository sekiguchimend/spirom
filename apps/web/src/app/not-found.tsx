import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-black mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">ページが見つかりませんでした</p>
      <Link
        href="/"
        className="bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition-colors"
      >
        トップページへ戻る
      </Link>
    </div>
  );
}
