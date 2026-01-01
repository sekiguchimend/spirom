import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 認証用Supabaseクライアント（クライアントサイド）
// @supabase/ssrのcreateBrowserClientはCookieベースのセッション管理を行う
export const supabaseAuth = createBrowserClient(supabaseUrl, supabaseAnonKey);
