import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Supabase Auth に一本化：Edgeでは判定せず常に通す
export function middleware(_request: NextRequest) {
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
