import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Header, Footer } from "@/components/layout";
import { AuthProvider } from "@/contexts/AuthContext";
import { safeJsonLd } from "@/lib/safeJsonLd";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  display: "swap",
  preload: true,
});

// Juice Agency に極めて近い、超極太・縦長サンセリフフォントとして、
// Impactよりもさらに凝縮されたスタイルを模倣するために
// Google Fontsの 'Anton' から、さらに縦長に変形させるスタイルを適用します。
// ここでは既存のローカルフォント定義の代わりにGoogle Fontsを使用し続けますが、
// page.tsx側でCSS transformを使用してフォントの縦横比を操作します。
import { Anton } from "next/font/google";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a2e",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://spirom.com"),
  title: {
    default: "Spirom - 大人もきれるカートゥーン",
    template: "%s | Spirom",
  },
  description: "遊び心と洗練を融合した、大人のためのカートゥーンファッションブランド。ポップでありながら上品な、他にはないスタイルを。",
  keywords: ["ファッション", "カートゥーン", "アパレル", "大人", "ポップ", "デザイナーズ"],
  authors: [{ name: "Spirom Inc." }],
  creator: "Spirom Inc.",
  publisher: "Spirom Inc.",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "Spirom",
    title: "Spirom - 大人もきれるカートゥーン",
    description: "遊び心と洗練を融合した、大人のためのカートゥーンファッションブランド。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Spirom - 大人もきれるカートゥーンファッション",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@spirom",
    creator: "@spirom",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://spirom.com/#organization",
  name: "Spirom",
  url: "https://spirom.com",
  logo: {
    "@type": "ImageObject",
    url: "https://spirom.com/logo.png",
    width: 512,
    height: 512,
  },
  sameAs: [
    "https://twitter.com/spirom",
    "https://instagram.com/spirom",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: ["Japanese"],
    email: "support@spirom.com",
  },
};

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://spirom.com/#website",
  name: "Spirom",
  url: "https://spirom.com",
  publisher: {
    "@id": "https://spirom.com/#organization",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://spirom.com/search?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
  inLanguage: "ja-JP",
};

const onlineStoreJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "@id": "https://spirom.com/#store",
  name: "Spirom",
  url: "https://spirom.com",
  description: "大人もきれるカートゥーンファッションブランド",
  currenciesAccepted: "JPY",
  paymentAccepted: "Credit Card, PayPay, Convenience Store Payment",
  priceRange: "¥3,000 - ¥50,000",
  areaServed: {
    "@type": "Country",
    name: "Japan",
  },
  brand: {
    "@id": "https://spirom.com/#organization",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" dir="ltr">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(webSiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(onlineStoreJsonLd) }}
        />
      </head>
      <body className={`${nunitoSans.variable} ${anton.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <AuthProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-accent focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold"
          >
            メインコンテンツへスキップ
          </a>
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
