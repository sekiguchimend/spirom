import type { Metadata } from 'next';
import { Header, Footer } from '@/components/layout';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { type Locale, locales, defaultLocale } from '@/lib/i18n/config';
import { SITE_NAME } from '@/lib/config';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

interface MetaDict {
  title: string;
  description: string;
  keywords: string;
  ogDescription: string;
  ogImageAlt: string;
  locale: string;
}

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = (locales.includes(lang as Locale) ? lang : defaultLocale) as Locale;

  const dict = await getDictionary(locale, 'common');
  const meta = (dict.meta || {}) as MetaDict;

  const title = meta.title || `${SITE_NAME} - Cartoon Fashion`;
  const description = meta.description || '';
  const keywords = meta.keywords?.split(',') || [];
  const ogDescription = meta.ogDescription || description;
  const ogImageAlt = meta.ogImageAlt || title;
  const ogLocale = meta.locale || 'ja_JP';

  return {
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    keywords,
    authors: [{ name: 'Spirom Inc.' }],
    creator: 'Spirom Inc.',
    publisher: 'Spirom Inc.',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: 'website',
      locale: ogLocale,
      siteName: SITE_NAME,
      title,
      description: ogDescription,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@spirom',
      creator: '@spirom',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'ja': '/ja',
        'en': '/en',
        'zh': '/zh',
        'ko': '/ko',
      },
    },
  };
}

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
