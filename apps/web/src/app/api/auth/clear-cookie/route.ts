import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAMES } from '@/lib/config';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAMES.ACCESS_TOKEN);
  cookieStore.delete(COOKIE_NAMES.REFRESH_TOKEN);
  cookieStore.delete(COOKIE_NAMES.SESSION_STARTED_AT);
  return NextResponse.json({ ok: true });
}

