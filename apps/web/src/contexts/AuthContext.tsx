'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  loginAction,
  registerAction,
  logoutAction,
  getMeAction,
  type User,
  type AuthResponse,
} from '@/lib/actions';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'spirom_auth_token';
const USER_KEY = 'spirom_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // useRefで依存関係を安定化（再レンダリングを防ぐ）
  const tokenRef = useRef(token);
  tokenRef.current = token;

  // 初期化済みフラグ（strictModeでの二重実行防止）
  const initializedRef = useRef(false);

  // ローカルストレージからユーザー情報を読み込む
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // ログイン
  const handleLogin = useCallback(async (email: string, password: string) => {
    const result = await loginAction({ email, password });
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Login failed');
    }
    const accessToken = result.data.tokens.access_token;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(result.data.user));
    setToken(accessToken);
    setUser(result.data.user);
  }, []);

  // 登録
  const handleRegister = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    const result = await registerAction({ email, password, name, phone });
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Registration failed');
    }
    const accessToken = result.data.tokens.access_token;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(result.data.user));
    setToken(accessToken);
    setUser(result.data.user);
  }, []);

  // ログアウト
  const handleLogout = useCallback(async () => {
    await logoutAction();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem('spirom_token_verified');
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  // ユーザー情報を更新（依存関係を安定化）
  const refreshUser = useCallback(async () => {
    if (!tokenRef.current) return;

    const result = await getMeAction();
    if (!result.success) {
      if (result.error === 'Token expired' || result.error === 'Not authenticated') {
        // ログアウト処理を直接実行（handleLogoutへの依存を避ける）
        await logoutAction();
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem('spirom_token_verified');
        setToken(null);
        setUser(null);
        router.push('/login');
      }
      return;
    }

    if (result.data) {
      setUser(result.data);
      localStorage.setItem(USER_KEY, JSON.stringify(result.data));
    }
  }, [router]);

  // 起動時にトークンの有効性を検証（セッション中1回のみ）
  useEffect(() => {
    if (isLoading) return;
    if (!token) return;

    const VERIFIED_KEY = 'spirom_token_verified';
    if (sessionStorage.getItem(VERIFIED_KEY)) return;

    refreshUser().then(() => {
      sessionStorage.setItem(VERIFIED_KEY, 'true');
    });
  }, [isLoading, token, refreshUser]);

  // コンテキスト値をメモ化（不要な再レンダリングを防ぐ）
  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    token,
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshUser,
  }), [user, token, isLoading, handleLogin, handleRegister, handleLogout, refreshUser]);

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
