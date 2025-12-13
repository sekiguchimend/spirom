import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// JWT検証用のシークレットキー
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not set');
    return null;
  }
  return new TextEncoder().encode(secret);
};

// JWTトークンの検証
async function verifyToken(token: string): Promise<boolean> {
  const secret = getJwtSecret();
  if (!secret) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    // 有効期限チェック（jwtVerifyが自動でやるが明示的にも確認）
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    // 必須フィールドの存在確認
    if (!payload.sub || !payload.email) {
      return false;
    }

    return true;
  } catch (error) {
    // トークンが無効（署名不一致、期限切れ、フォーマット不正など）
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('spirom_auth_token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '');

  // 認証が必要なページ
  const protectedPaths = ['/checkout', '/account'];

  // 認証不要なページ（ログイン/登録ページ）
  const publicPaths = ['/login', '/register'];

  const pathname = request.nextUrl.pathname;
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isPublicPath = publicPaths.some(path => pathname === path);

  // 認証が必要なページにアクセスしている場合
  if (isProtectedPath) {
    // トークンがない場合
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // トークンの検証
    const isValid = await verifyToken(token);
    if (!isValid) {
      // 無効なトークンの場合、Cookieを削除してログインページへ
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('spirom_auth_token');
      response.cookies.delete('spirom_refresh_token');
      return response;
    }
  }

  // ログイン済みユーザーがログイン/登録ページにアクセスした場合
  if (isPublicPath && token) {
    const isValid = await verifyToken(token);
    if (isValid) {
      return NextResponse.redirect(new URL('/', request.url));
    }
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
