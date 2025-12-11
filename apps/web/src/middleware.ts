import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('spirom_auth_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  // 認証が必要なページ
  const protectedPaths = ['/checkout', '/account'];
  
  // 認証不要なページ（ログイン/登録ページ）
  const publicPaths = ['/login', '/register'];

  const pathname = request.nextUrl.pathname;
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isPublicPath = publicPaths.some(path => pathname === path);

  // 認証が必要なページにアクセスしているが、トークンがない場合
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ログイン済みユーザーがログイン/登録ページにアクセスした場合
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/checkout/:path*',
    '/account/:path*',
    '/login',
    '/register',
  ],
};

