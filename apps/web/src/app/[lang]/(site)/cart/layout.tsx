// robots設定のみ（タイトルは親レイアウトから継承）
export const metadata = {
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
