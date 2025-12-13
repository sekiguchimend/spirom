import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'カート',
  description: 'ショッピングカート。Spiromのカートゥーンファッションアイテムをまとめてご確認いただけます。',
  robots: {
    index: false,
    follow: true,
  },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
