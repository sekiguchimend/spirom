import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'よくある質問',
  description: 'Spiromのよくある質問。ご注文方法・配送・お支払い・返品についてのQ&Aをまとめています。',
  alternates: {
    canonical: '/faq',
  },
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
