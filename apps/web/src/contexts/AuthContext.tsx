'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAuth } from '@/lib/supabase-auth';
import { mergeLocalCartToServer } from '@/lib/cart';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '@/types';
import { ROUTES } from '@/lib/routes';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Supabase UserをアプリのUser型に変換
function mapSupabaseUser(supabaseUser: SupabaseUser, profile?: { name?: string; phone?: string; role?: string }): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: profile?.name || supabaseUser.user_metadata?.name || '',
    phone: profile?.phone || supabaseUser.user_metadata?.phone || null,
    role: profile?.role || 'customer',
    is_active: true,
    is_verified: supabaseUser.email_confirmed_at !== null,
    created_at: supabaseUser.created_at,
    updated_at: supabaseUser.updated_at || supabaseUser.created_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // プロファイル情報を取得（APIプロキシ経由）
  const fetchProfile = useCallback(async (userId: string, accessToken: string) => {
    try {
      const response = await fetch('/api/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const result = await response.json();
        return result.data;
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
    return null;
  }, []);

  // 初期化
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabaseAuth.auth.getSession();

        if (currentSession?.user) {
          setSession(currentSession);
          const profile = await fetchProfile(currentSession.user.id, currentSession.access_token);
          setUser(mapSupabaseUser(currentSession.user, profile));
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // セッション変更を監視（SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED のみ処理）
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(async (event, newSession) => {
      // 初期化時のINITIAL_SESSIONは上で処理済みなのでスキップ
      if (event === 'INITIAL_SESSION') return;

      setSession(newSession);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // SIGNED_IN または TOKEN_REFRESHED の場合のみプロファイルを取得
      if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const profile = await fetchProfile(newSession.user.id, newSession.access_token);
        setUser(mapSupabaseUser(newSession.user, profile));
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ログイン
  const handleLogin = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.session && data.user) {
      setSession(data.session);
      const profile = await fetchProfile(data.user.id, data.session.access_token);
      setUser(mapSupabaseUser(data.user, profile));

      // ローカルカートをサーバーに統合
      try {
        await mergeLocalCartToServer();
      } catch (e) {
        console.error('Failed to merge local cart:', e);
      }
    }
  }, [fetchProfile]);

  // 登録: Supabase Auth SDKで直接登録
  const handleRegister = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    // 1) Supabase Authでユーザー作成
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('ユーザー作成に失敗しました');
    }

    // 2) セッションがあれば（メール確認不要の場合）プロファイル作成
    if (data.session) {
      try {
        await fetch('/api/v1/auth/profile', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, phone }),
        });
      } catch (profileError) {
        console.error('Failed to create profile:', profileError);
      }

      setSession(data.session);
      setUser(mapSupabaseUser(data.user, { name, phone }));
    } else {
      // メール確認が必要な場合
      throw new Error('確認メールを送信しました。メールを確認してください。');
    }
  }, []);

  // ログアウト
  const handleLogout = useCallback(async () => {
    await supabaseAuth.auth.signOut();
    setUser(null);
    setSession(null);
    router.push(ROUTES.AUTH.LOGIN);
  }, [router]);

  // ユーザー情報を更新
  const refreshUser = useCallback(async () => {
    const { data: { session: currentSession } } = await supabaseAuth.auth.getSession();

    if (currentSession?.user) {
      setSession(currentSession);
      const profile = await fetchProfile(currentSession.user.id, currentSession.access_token);
      setUser(mapSupabaseUser(currentSession.user, profile));
    } else {
      setUser(null);
      setSession(null);
    }
  }, [fetchProfile]);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    session,
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshUser,
  }), [user, session, isLoading, handleLogin, handleRegister, handleLogout, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
