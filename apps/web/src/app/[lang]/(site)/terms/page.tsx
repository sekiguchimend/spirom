import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/ui';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

type TermsSection = {
  title: string;
  content?: string;
  items?: string[];
};

type TermsDict = {
  meta: { title: string; description: string };
  header: { title: string; subtitle: string; lastUpdated: string };
  sections: TermsSection[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = (lang as Locale) || defaultLocale;
  const dict = (await getDictionary(locale, 'terms')) as TermsDict;

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `/${locale}/terms`,
    },
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (lang as Locale) || defaultLocale;
  const dict = (await getDictionary(locale, 'terms')) as TermsDict;

  const { header, sections } = dict;

  return (
    <LegalPageLayout
      title={header.title}
      subtitle={header.subtitle}
      lastUpdated={header.lastUpdated}
    >
      {sections.map((section, index) => (
        <section key={index} className={index < sections.length - 1 ? 'mb-8' : ''}>
          <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">{section.title}</h2>
          {section.content && (
            <p className={`text-sm sm:text-base text-gray-700 leading-relaxed ${section.items ? 'mb-4' : ''}`}>
              {section.content}
            </p>
          )}
          {section.items && (
            <ul className="text-sm sm:text-base text-gray-700 space-y-2 list-disc list-inside">
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </LegalPageLayout>
  );
}
