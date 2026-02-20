import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/ui';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

type LegalSection = {
  label: string;
  value: string;
  note?: string;
  items?: string[];
};

type LegalDict = {
  meta: { title: string; description: string };
  header: { title: string; subtitle: string; lastUpdated: string };
  sections: {
    seller: LegalSection;
    manager: LegalSection;
    email: LegalSection;
    price: LegalSection;
    additionalFees: LegalSection;
    payment: LegalSection;
    paymentTiming: LegalSection;
    delivery: LegalSection;
    returns: LegalSection;
    returnContact: LegalSection;
  };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = (lang as Locale) || defaultLocale;
  const dict = (await getDictionary(locale, 'legal')) as LegalDict;

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `/${locale}/legal`,
    },
  };
}

export default async function LegalNoticePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (lang as Locale) || defaultLocale;
  const dict = (await getDictionary(locale, 'legal')) as LegalDict;

  const { header, sections } = dict;

  return (
    <LegalPageLayout
      title={header.title}
      subtitle={header.subtitle}
      lastUpdated={header.lastUpdated}
    >
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">{sections.seller.label}</h2>
          <p className="text-base text-black font-medium">{sections.seller.value}</p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">{sections.manager.label}</h2>
          <p className="text-base text-black font-medium">{sections.manager.value}</p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">{sections.email.label}</h2>
          <p className="text-base text-black font-medium">{sections.email.value}</p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">{sections.price.label}</h2>
          <p className="text-base text-black font-medium">{sections.price.value}</p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">{sections.additionalFees.label}</h2>
          <p className="text-base text-black font-medium">
            {sections.additionalFees.value}<br />
            {sections.additionalFees.note}
          </p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">{sections.payment.label}</h2>
          <p className="text-base text-black font-medium">{sections.payment.value}</p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">{sections.paymentTiming.label}</h2>
          <p className="text-base text-black font-medium">{sections.paymentTiming.value}</p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">{sections.delivery.label}</h2>
          <p className="text-base text-black font-medium">
            {sections.delivery.value}<br />
            {sections.delivery.note}
          </p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">{sections.returns.label}</h2>
          <p className="text-base text-black font-medium mb-2">{sections.returns.value}</p>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            {sections.returns.items?.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-2">{sections.returnContact.label}</h2>
          <p className="text-base text-black font-medium">{sections.returnContact.value}</p>
        </div>
      </div>
    </LegalPageLayout>
  );
}
