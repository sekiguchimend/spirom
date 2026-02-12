import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '新規会員登録',
  description: 'Spiromの新規会員登録。アカウントを作成して、カートゥーンファッションの最新情報や会員限定特典をお楽しみください。',
  robots: {
    index: false,
    follow: true,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
