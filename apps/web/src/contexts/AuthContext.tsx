'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { login as loginApi, register as registerApi, logout as logoutApi, getMe, type User, type AuthResponse } from '@/lib/api';

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

// クッキーを設定する関数
const setCookie = (name: string, value: string, days: number = 30) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const cookieValue = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  document.cookie = cookieValue;
};

// クッキーを削除する関数
const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

// クッキーから値を取得する関数
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // ローカルストレージとクッキーからトークンとユーザー情報を読み込む
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // クッキーにもトークンが保存されていない場合は保存
        if (!getCookie(TOKEN_KEY)) {
          setCookie(TOKEN_KEY, storedToken);
        }
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        deleteCookie(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // トークンとユーザー情報を保存（localStorageとクッキーの両方に保存）
  const saveAuth = useCallback((authResponse: AuthResponse) => {
    const accessToken = authResponse.tokens.access_token;
    // localStorageに保存
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user));
    // クッキーにも保存（30日間有効）
    setCookie(TOKEN_KEY, accessToken, 30);
    setToken(accessToken);
    setUser(authResponse.user);
  }, []);

  // ログイン
  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      const response = await loginApi({ email, password });
      saveAuth(response);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [saveAuth]);

  // 登録
  const handleRegister = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    try {
      const response = await registerApi({ email, password, name, phone });
      saveAuth(response);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, [saveAuth]);

  // ログアウト
  const handleLogout = useCallback(async () => {
    try {
      if (token) {
        await logoutApi(token);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      deleteCookie(TOKEN_KEY);
      setToken(null);
      setUser(null);
      router.push('/login');
    }
  }, [token, router]);

  // ユーザー情報を更新
  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await getMe(token);
      setUser(response.data);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data));
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // トークンが無効な場合はログアウト
      if (error instanceof Error && error.message.includes('401')) {
        handleLogout();
      }
    }
  }, [token, handleLogout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshUser,
      }}
    >
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

