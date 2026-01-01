import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAMES } from '@/lib/config';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'missing token' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === 'production';

  cookieStore.set(COOKIE_NAMES.ACCESS_TOKEN, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 60 * 60, // 1h
    path: '/',
  });

  return NextResponse.json({ ok: true });
}

