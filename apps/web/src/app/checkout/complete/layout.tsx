import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '注文完了',
  description: 'ご注文ありがとうございます。Spiromでのお買い物が完了しました。',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutCompleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
