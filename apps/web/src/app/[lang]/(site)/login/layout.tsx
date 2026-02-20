// robots設定のみ（タイトルは親レイアウトから継承）
export const metadata = {
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
