import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// 管理者アクセスを許可するIPアドレス（CIDR表記可）
// 環境変数 ADMIN_ALLOWED_IPS で設定可能（カンマ区切り）
const ADMIN_ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS?.split(',').map(ip => ip.trim()) || [];

// IPアドレスがCIDR範囲内かチェック
function isIpInCidr(ip: string, cidr: string): boolean {
  // IPv6の場合はシンプルな完全一致チェック
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
  // 許可リストが空の場合は全て許可（開発環境用）
  if (ADMIN_ALLOWED_IPS.length === 0) {
    return true;
  }

  // localhost は常に許可
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
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
  // Vercelの場合
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    return vercelIp.split(',')[0].trim();
  }

  // Cloudflareの場合
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  // 一般的なX-Forwarded-For
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim();
  }

  // X-Real-IP
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return '127.0.0.1';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 管理者画面へのアクセス
  if (pathname.startsWith('/admin')) {
    const clientIp = getClientIp(request);

    // IP制限チェック
    if (!isIpAllowed(clientIp)) {
      console.warn(`[Admin Access Denied] IP: ${clientIp}, Path: ${pathname}`);
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Supabaseセッションチェック（サーバーサイド）
    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // 未ログインの場合はログインページへリダイレクト
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ユーザーのロールをチェック（usersテーブルから取得）
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      console.warn(`[Admin Access Denied] User: ${user.email}, Role: ${userData?.role || 'unknown'}, IP: ${clientIp}`);
      // 管理者でない場合はホームへリダイレクト
      return NextResponse.redirect(new URL('/', request.url));
    }

    console.info(`[Admin Access Granted] User: ${user.email}, IP: ${clientIp}, Path: ${pathname}`);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/checkout/:path*',
    '/account/:path*',
    '/login',
    '/register',
  ],
};
