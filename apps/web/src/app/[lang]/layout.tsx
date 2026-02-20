import { type Locale, locales, isValidLocale } from '@/lib/i18n/config';
import { notFound } from 'next/navigation';
import Script from 'next/script';

// 静的パラメータを生成（ビルド時に全言語のページを生成）
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

interface LangLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function LangLayout({
  children,
  params,
}: LangLayoutProps) {
  const { lang } = await params;

  // 無効な言語の場合は404
  if (!isValidLocale(lang)) {
    notFound();
  }

  return (
    <>
      {/* クライアントサイドでhtml lang属性を更新 */}
      <Script
        id="set-lang"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang="${lang}";`,
        }}
      />
      {children}
    </>
  );
}
