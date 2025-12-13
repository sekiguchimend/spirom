'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  loginAction,
  registerAction,
  logoutAction,
  getMeAction,
  refreshSessionAction,
} from '@/lib/actions';
import type { User } from '@/types';
import { SESSION_REFRESH_INTERVAL_MS } from '@/lib/config';
import { ROUTES } from '@/lib/routes';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 初期化済みフラグ（strictModeでの二重実行防止）
  const initializedRef = useRef(false);

  // 初期化（cookie-onlyで現在のログイン状態を判定）
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // localStorage は改ざん可能なため「認証済みユーザー」としては一切信用しない
    // （UIの一時表示に使う場合でも権限判断に利用しないこと）

    const bootstrap = async () => {
      setIsLoading(true);
      const me = await getMeAction();
      if (me.success && me.data) {
        setUser(me.data);
        setIsLoading(false);
        return;
      }

      // Accessが切れている/無い場合は refresh を試す（最大1日）
      if (me.error === 'Token expired' || me.error === 'Not authenticated') {
        const refreshed = await refreshSessionAction();
        if (refreshed.success) {
          const me2 = await getMeAction();
          if (me2.success && me2.data) {
            setUser(me2.data);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    bootstrap();
  }, []);

  // ログイン
  const handleLogin = useCallback(async (email: string, password: string) => {
    const result = await loginAction({ email, password });
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Login failed');
    }
    setUser(result.data.user);
  }, []);

  // 登録
  const handleRegister = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    const result = await registerAction({ email, password, name, phone });
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Registration failed');
    }
    setUser(result.data.user);
  }, []);

  // ログアウト
  const handleLogout = useCallback(async () => {
    await logoutAction();
    setUser(null);
    router.push(ROUTES.AUTH.LOGIN);
  }, [router]);

  // ユーザー情報を更新（依存関係を安定化）
  const refreshUser = useCallback(async () => {
    const result = await getMeAction();
    if (!result.success) {
      if (result.error === 'Token expired' || result.error === 'Not authenticated') {
        // refresh を試してから判定
        const refreshed = await refreshSessionAction();
        if (refreshed.success) {
          const me2 = await getMeAction();
          if (me2.success && me2.data) {
            setUser(me2.data);
            return;
          }
        }

        // セッション終了
        await logoutAction();
        setUser(null);
        router.push(ROUTES.AUTH.LOGIN);
      }
      return;
    }

    if (result.data) {
      setUser(result.data);
    }
  }, [router]);

  // ログイン状態を維持（Access短命 + Refreshで最大1日）
  useEffect(() => {
    if (isLoading) return;
    if (!user) return;

    const interval = window.setInterval(() => {
      refreshSessionAction().catch(() => {
        // 失敗時は次のrefreshUserで落ちるのでここでは何もしない
      });
    }, SESSION_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [user, isLoading]);

  // コンテキスト値をメモ化（不要な再レンダリングを防ぐ）
  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshUser,
  }), [user, isLoading, handleLogin, handleRegister, handleLogout, refreshUser]);

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
