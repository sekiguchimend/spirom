import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, getServerUser } from '@/lib/server-api';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { ROUTES } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  // Server Componentで認証チェック
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  // Server ComponentからBFFを直接叩く
  const user = await getServerUser();

  if (!user) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  return (
    <div className="min-h-screen bg-bg-light pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* ユーザー情報カード */}
          <div className="bg-primary/5 rounded-2xl p-6 md:p-8">
            {/* ヘッダー */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-0.5 w-8 bg-primary" />
                <p className="text-xs tracking-[0.2em] text-primary uppercase font-bold">
                  Account
                </p>
                <div className="h-0.5 w-8 bg-primary" />
              </div>
              <h1 className="text-center text-xl text-text-dark" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>
                マイアカウント
              </h1>
            </div>

            {/* ユーザー情報 */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M20 21a8 8 0 0 0-16 0"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-500 mb-0.5">お名前</p>
                  <p className="text-sm font-bold text-text-dark truncate">{user.name || '未設定'}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-500 mb-0.5">メールアドレス</p>
                  <p className="text-sm font-bold text-text-dark truncate">{user.email || '未設定'}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-500 mb-0.5">電話番号</p>
                  <p className="text-sm font-bold text-text-dark truncate">{user.phone || '未設定'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* メニューカード */}
          <div className="bg-primary/5 rounded-2xl p-6 md:p-8">
            <h2 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">メニュー</h2>
            <div className="space-y-3">
              <Link
                href={ROUTES.ACCOUNT.NEW_ADDRESS}
                className="flex items-center gap-4 p-4 bg-bg-light rounded-xl hover:bg-primary/5 transition-colors group"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-dark">配送先住所</p>
                  <p className="text-xs text-gray-500">住所の登録・編集</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </Link>

              <Link
                href={ROUTES.ORDERS.INDEX}
                className="flex items-center gap-4 p-4 bg-bg-light rounded-xl hover:bg-primary/5 transition-colors group"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-dark">注文履歴</p>
                  <p className="text-xs text-gray-500">過去の注文を確認</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* ログアウトボタン（Client Component） */}
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
