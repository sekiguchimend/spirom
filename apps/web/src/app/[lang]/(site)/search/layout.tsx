import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '検索',
  description: 'Spiromの商品検索。大人もきれるカートゥーンファッションアイテムをキーワードで探せます。',
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
