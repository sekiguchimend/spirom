'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function AccountPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* ページヘッダー */}
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-1 w-12 bg-[#4a7c59]" />
              <p className="text-xs tracking-[0.2em] text-[#4a7c59] uppercase font-bold">
                Account
              </p>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-[#323232] mb-2">
              アカウント
            </h1>
          </header>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-[#4a7c59] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* ユーザー情報カード */}
              <div className="md:col-span-2 bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
                <h2 className="text-xl sm:text-2xl font-black text-[#323232] mb-6">
                  ユーザー情報
                </h2>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-bold text-gray-600 mb-1">メールアドレス</dt>
                    <dd className="text-base text-[#323232]">{user?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-bold text-gray-600 mb-1">お名前</dt>
                    <dd className="text-base text-[#323232]">{user?.name}</dd>
                  </div>
                  {user?.phone && (
                    <div>
                      <dt className="text-sm font-bold text-gray-600 mb-1">電話番号</dt>
                      <dd className="text-base text-[#323232]">{user.phone}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* アクションメニュー */}
              <div className="space-y-4">
                <Link
                  href="/account/addresses/new"
                  className="block w-full bg-[#4a7c59] text-white rounded-xl p-4 font-bold text-center hover:bg-[#3d6a4a] transition-colors"
                >
                  住所を登録・編集
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full bg-gray-200 text-gray-700 rounded-xl p-4 font-bold text-center hover:bg-gray-300 transition-colors"
                >
                  ログアウト
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

