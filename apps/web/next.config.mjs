/** @type {import('next').NextConfig} */

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // セキュリティ: Stripe/Next.jsの要件で unsafe-inline/eval が必要
      // 将来的にはnonce-basedに移行を検討
      // strict-dynamic と組み合わせることで安全性を向上
      `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''} https://cdn.sanity.io https://js.stripe.com https://m.stripe.com https://m.stripe.network https://pay.google.com https://www.googletagmanager.com https://www.google-analytics.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.spirom.com https://bff.spirom.com https://*.sanity.io https://api.stripe.com https://m.stripe.com https://m.stripe.network https://pay.google.com http://localhost:3001 http://localhost:8787 http://127.0.0.1:8787 https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://m.stripe.com https://m.stripe.network https://pay.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // セキュリティ強化: オブジェクト埋め込みを禁止
      "object-src 'none'",
      // セキュリティ強化: アップグレード不安全なリクエスト
      "upgrade-insecure-requests",
    ].join('; ')
  },
];

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "assets.spirom.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  transpilePackages: ["@spirom/ui"],

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // Production optimizations
  productionBrowserSourceMaps: false,

  // Experimental features for performance
  experimental: {
    optimizePackageImports: ['@spirom/ui', 'lucide-react'],
  },

  // Optimize CSS
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
