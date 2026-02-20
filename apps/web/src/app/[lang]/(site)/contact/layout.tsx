import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'お問い合わせ',
  description: 'Spiromへのお問い合わせページ。ご注文・配送・返品・その他ご質問はこちらからお気軽にどうぞ。',
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
