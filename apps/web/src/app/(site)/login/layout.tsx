import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ログイン',
  description: 'Spiromアカウントにログイン。会員限定の特典やお気に入り機能をご利用いただけます。',
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
