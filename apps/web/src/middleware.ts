import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  locales,
  defaultLocale,
  isValidLocale,
  type Locale,
} from '@/lib/i18n/config';
import { detectLocaleFromRequest } from '@/lib/i18n/geo';
import { extractLocaleFromPath } from '@/lib/i18n/get-dictionary';

// 管理者アクセスを許可するIPアドレス（CIDR表記可）
const ADMIN_ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS?.split(',').map(ip => ip.trim()) || [];

// 言語リダイレクトをスキップするパス
const SKIP_LOCALE_PATHS = [
  '/api',
  '/admin',
  '/_next',
  '/favicon',
  '/manifest',
  '/robots',
  '/sitemap',
];

// IPアドレスがCIDR範囲内かチェック
function isIpInCidr(ip: string, cidr: string): boolean {
  if (ip.includes(':') || cidr.includes(':')) {
    return ip === cidr || cidr === ip.split(':').slice(0, -1).join(':') + '::';
  }

  const [range, bits] = cidr.split('/');
  const mask = bits ? parseInt(bits, 10) : 32;

  const ipParts = ip.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);

  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
  const maskNum = ~((1 << (32 - mask)) - 1);

  return (ipNum & maskNum) === (rangeNum & maskNum);
}

// IPアドレスが許可リストに含まれるかチェック
function isIpAllowed(ip: string): boolean {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction && (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost')) {
    return true;
  }

  if (ADMIN_ALLOWED_IPS.length === 0) {
    if (isProduction) {
      console.error('[Security] ADMIN_ALLOWED_IPS is not configured in production');
      return false;
    }
    console.warn('[Security] ADMIN_ALLOWED_IPS is empty - allowing all IPs in development');
    return true;
  }

  return ADMIN_ALLOWED_IPS.some(allowed => {
    if (allowed.includes('/')) {
      return isIpInCidr(ip, allowed);
    }
    return ip === allowed;
  });
}

// クライアントIPを取得
function getClientIp(request: NextRequest): string {
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0].trim();

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return '127.0.0.1';
}

// 言語リダイレクトをスキップすべきか判定
function shouldSkipLocaleRedirect(pathname: string): boolean {
  // 静的ファイル
  if (pathname.includes('.')) return true;

  // 特定のパス
  return SKIP_LOCALE_PATHS.some(path => pathname.startsWith(path));
}

// 言語リダイレクト処理
function handleLocaleRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // スキップ対象のパス
  if (shouldSkipLocaleRedirect(pathname)) {
    return null;
  }

  // 既に言語プレフィックスがある場合
  const existingLocale = extractLocaleFromPath(pathname);
  if (existingLocale) {
    // レスポンスヘッダーに言語情報を追加（後続処理用）
    const response = NextResponse.next();
    response.headers.set('x-locale', existingLocale);
    response.headers.set('x-country', request.headers.get('x-vercel-ip-country') || '');
    return response;
  }

  // IPから言語を判定
  const detectedLocale = detectLocaleFromRequest(request);

  // 言語プレフィックス付きURLにリダイレクト
  const url = request.nextUrl.clone();
  url.pathname = `/${detectedLocale}${pathname === '/' ? '' : pathname}`;

  const response = NextResponse.redirect(url);
  response.headers.set('x-locale', detectedLocale);
  response.headers.set('x-country', request.headers.get('x-vercel-ip-country') || '');

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // デバッグログ
  console.log('[Middleware]', pathname);

  // 管理者画面へのアクセス（言語プレフィックスなし）
  if (pathname.startsWith('/admin')) {
    const clientIp = getClientIp(request);

    if (!isIpAllowed(clientIp)) {
      console.warn(`[Admin Access Denied] IP: ${clientIp}, Path: ${pathname}`);
      return new NextResponse('Forbidden', { status: 403 });
    }

    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      console.warn(`[Admin Access Denied] User: ${user.email}, Role: ${userData?.role || 'unknown'}, IP: ${clientIp}`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    console.info(`[Admin Access Granted] User: ${user.email}, IP: ${clientIp}, Path: ${pathname}`);
    return response;
  }

  // 言語リダイレクト処理
  const localeResponse = handleLocaleRedirect(request);
  if (localeResponse) {
    return localeResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
