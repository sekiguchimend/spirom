'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) return '必須';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return '正しいメールアドレスを入力してください';
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) return '必須';
    return undefined;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    const error = validateEmail(value);
    setFieldErrors(prev => ({ ...prev, email: error }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const error = validatePassword(value);
    setFieldErrors(prev => ({ ...prev, password: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 全フィールドのバリデーション
    const errors: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setFieldErrors(errors);

    // エラーがあれば送信しない
    if (Object.values(errors).some(err => err !== undefined)) {
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-[#4a7c59]/5 rounded-2xl p-6 md:p-8">
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-[#4a7c59]" />
              <p className="text-xs tracking-[0.2em] text-[#4a7c59] uppercase font-bold">
                Login
              </p>
              <div className="h-0.5 w-8 bg-[#4a7c59]" />
            </div>
            <h2 className="text-center text-xl text-[#323232]" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>
              ログイン
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              または{' '}
              <Link href="/register" className="font-medium text-[#4a7c59] hover:text-[#3d6a4a]">
                新規登録
              </Link>
            </p>
          </div>
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-[#323232] mb-2">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={`appearance-none relative block w-full px-4 py-3 border-2 placeholder-gray-400 text-[#323232] rounded-xl focus:outline-none text-sm transition-colors ${
                    fieldErrors.email
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-gray-200 focus:border-[#4a7c59]'
                  }`}
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-[#323232] mb-2">
                  パスワード <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className={`appearance-none relative block w-full px-4 py-3 border-2 placeholder-gray-400 text-[#323232] rounded-xl focus:outline-none text-sm transition-colors ${
                    fieldErrors.password
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-gray-200 focus:border-[#4a7c59]'
                  }`}
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.password}</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-full text-white bg-[#4a7c59] hover:bg-[#3d6a4a] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
