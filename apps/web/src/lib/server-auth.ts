import { createSupabaseServerClient } from './supabase-server';

/**
 * サーバー側での認証状態/アクセストークン取得を Supabase SSR に一本化する。
 * - クライアント(AuthContext)のセッションと同じ cookie を参照するため、状態がズレない。
 */
export async function getServerAccessToken(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function isServerAuthenticated(): Promise<boolean> {
  return !!(await getServerAccessToken());
}


