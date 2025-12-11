'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const validateName = (value: string): string | undefined => {
    if (!value.trim()) return '必須';
    if (value.trim().length < 2) return '2文字以上で入力してください';
    return undefined;
  };

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) return '必須';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return '正しいメールアドレスを入力してください';
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) return '必須';
    if (value.length < 8) return '8文字以上で入力してください';
    if (!/[A-Za-z]/.test(value)) return '英字を含めてください';
    if (!/[0-9]/.test(value)) return '数字を含めてください';
    return undefined;
  };

  const validatePhone = (value: string): string | undefined => {
    if (!value.trim()) return '必須';
    const phoneRegex = /^[0-9-]{10,14}$/;
    if (!phoneRegex.test(value.replace(/\s/g, ''))) return '正しい電話番号を入力してください';
    return undefined;
  };

  const handleNameChange = (value: string) => {
    setName(value);
    const error = validateName(value);
    setFieldErrors(prev => ({ ...prev, name: error }));
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

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    const error = validatePhone(value);
    setFieldErrors(prev => ({ ...prev, phone: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 全フィールドのバリデーション
    const errors: FieldErrors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      phone: validatePhone(phone),
    };
    setFieldErrors(errors);

    // エラーがあれば送信しない
    if (Object.values(errors).some(err => err !== undefined)) {
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name, phone);
      router.push('/account/addresses/new');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
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
                Register
              </p>
              <div className="h-0.5 w-8 bg-[#4a7c59]" />
            </div>
            <h2 className="text-center text-xl text-[#323232]" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>
              新規登録
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" className="font-medium text-[#4a7c59] hover:text-[#3d6a4a]">
                ログイン
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
                <label htmlFor="name" className="block text-xs font-bold text-[#323232] mb-2">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className={`appearance-none relative block w-full px-4 py-3 border-2 placeholder-gray-400 text-[#323232] rounded-xl focus:outline-none text-sm transition-colors ${
                    fieldErrors.name
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-gray-200 focus:border-[#4a7c59]'
                  }`}
                  placeholder="山田 太郎"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.name}</p>
                )}
              </div>
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
                  autoComplete="new-password"
                  className={`appearance-none relative block w-full px-4 py-3 border-2 placeholder-gray-400 text-[#323232] rounded-xl focus:outline-none text-sm transition-colors ${
                    fieldErrors.password
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-gray-200 focus:border-[#4a7c59]'
                  }`}
                  placeholder="英数字8文字以上"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.password}</p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-[#323232] mb-2">
                  電話番号 <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className={`appearance-none relative block w-full px-4 py-3 border-2 placeholder-gray-400 text-[#323232] rounded-xl focus:outline-none text-sm transition-colors ${
                    fieldErrors.phone
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-gray-200 focus:border-[#4a7c59]'
                  }`}
                  placeholder="090-1234-5678"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.phone}</p>
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
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                {isLoading ? '登録中...' : '新規登録'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

