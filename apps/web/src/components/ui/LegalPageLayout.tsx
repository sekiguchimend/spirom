import type { ReactNode } from 'react';

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, subtitle, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-20">
        <header className="text-center mb-8 sm:mb-16">
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black mb-2 sm:mb-4 tracking-wide text-black"
            style={{ fontFamily: 'var(--font-anton), sans-serif' }}
          >
            {title}
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 font-bold uppercase tracking-wider">
            {subtitle}
          </p>
        </header>

        <div className="bg-white border-3 sm:border-4 border-black rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="prose prose-sm sm:prose max-w-none">
            {children}
          </div>

          <p className="text-xs sm:text-sm text-gray-500 mt-8 pt-6 border-t-2 border-black">
            最終更新日: {lastUpdated}
          </p>
        </div>
      </div>
    </div>
  );
}
