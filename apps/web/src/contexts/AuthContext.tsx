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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // ローカルストレージからトークンとユーザー情報を読み込む
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // トークンとユーザー情報を保存
  const saveAuth = useCallback((authResponse: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, authResponse.tokens.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user));
    setToken(authResponse.tokens.access_token);
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

