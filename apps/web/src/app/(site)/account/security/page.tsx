'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/routes';

interface MfaFactor {
  id: string;
  friendly_name: string | null;
  factor_type: string;
  status: string;
  created_at: string;
}

interface EnrollResponse {
  id: string;
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
  friendly_name: string;
}

export default function SecurityPage() {
  const { user, session, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2FA登録用
  const [enrollData, setEnrollData] = useState<EnrollResponse | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(ROUTES.AUTH.LOGIN);
    }
  }, [user, authLoading, router]);

  // MFA要素一覧を取得
  useEffect(() => {
    if (user && session?.access_token) {
      fetchFactors();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session]);

  const fetchFactors = async () => {
    try {
      setIsLoading(true);
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/v1/auth/mfa/factors', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setFactors(data);
      }
    } catch (err) {
      console.error('Failed to fetch MFA factors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2FA登録開始
  const handleEnroll = async () => {
    try {
      setIsEnrolling(true);
      setError(null);
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/v1/auth/mfa/enroll', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || '2FA登録に失敗しました');
      }

      const data: EnrollResponse = await res.json();
      setEnrollData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '2FA登録に失敗しました');
    } finally {
      setIsEnrolling(false);
    }
  };

  // 2FA検証（有効化）
  const handleVerify = async () => {
    if (!enrollData || !verifyCode) return;

    try {
      setIsVerifying(true);
      setError(null);
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          factor_id: enrollData.id,
          code: verifyCode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || '認証コードが正しくありません');
      }

      // 成功
      setEnrollData(null);
      setVerifyCode('');
      fetchFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証に失敗しました');
    } finally {
      setIsVerifying(false);
    }
  };

  // 2FA無効化
  const handleUnenroll = async (factorId: string) => {
    if (!confirm('二要素認証を無効にしますか？')) return;

    try {
      setError(null);
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/v1/auth/mfa/unenroll', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ factor_id: factorId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || '2FA無効化に失敗しました');
      }

      fetchFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : '2FA無効化に失敗しました');
    }
  };

  const activeFactors = factors.filter((f) => f.status === 'verified');
  const has2FA = activeFactors.length > 0;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-bg-light pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="bg-primary/5 rounded-2xl p-6 md:p-8">
            <div className="mb-6">
              <Link
                href={ROUTES.ACCOUNT.INDEX}
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors mb-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                アカウントに戻る
              </Link>
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-0.5 w-8 bg-primary" />
                <p className="text-xs tracking-[0.2em] text-primary uppercase font-bold">
                  Security
                </p>
                <div className="h-0.5 w-8 bg-primary" />
              </div>
              <h1 className="text-center text-xl text-text-dark" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>
                セキュリティ設定
              </h1>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 font-bold">{error}</p>
              </div>
            )}

            {/* 2FA ステータス */}
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${has2FA ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={has2FA ? '#22c55e' : '#eab308'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-text-dark">二要素認証 (2FA)</h2>
                  <p className={`text-sm font-bold ${has2FA ? 'text-green-600' : 'text-yellow-600'}`}>
                    {has2FA ? '有効' : '無効'}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                二要素認証を有効にすると、ログイン時にパスワードに加えて認証アプリのコードが必要になります。
                アカウントのセキュリティが大幅に向上します。
              </p>

              {/* 登録済みの要素 */}
              {has2FA && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-500 mb-3">登録済みの認証方法</h3>
                  <div className="space-y-2">
                    {activeFactors.map((factor) => (
                      <div
                        key={factor.id}
                        className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <path d="m9 11 3 3L22 4"/>
                          </svg>
                          <span className="text-sm font-bold text-text-dark">
                            {factor.friendly_name || '認証アプリ'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUnenroll(factor.id)}
                          className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 登録フロー */}
              {!has2FA && !enrollData && (
                <button
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                  className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {isEnrolling ? '準備中...' : '二要素認証を有効にする'}
                </button>
              )}

              {/* QRコード表示 */}
              {enrollData && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-text-dark mb-4">
                      1. 認証アプリでQRコードをスキャン
                    </h3>
                    <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-xl">
                      {/* Base64 QRコード画像 */}
                      <Image
                        src={enrollData.totp.qr_code}
                        alt="2FA QR Code"
                        width={200}
                        height={200}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Google Authenticator, Authy などの認証アプリを使用
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-bold text-gray-500 mb-2">
                      手動入力用シークレットキー
                    </p>
                    <code className="block text-sm font-mono bg-white p-2 rounded border break-all">
                      {enrollData.totp.secret}
                    </code>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-text-dark mb-3">
                      2. 認証コードを入力して確認
                    </h3>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="6桁のコード"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-lg font-bold tracking-widest focus:border-primary focus:outline-none"
                      />
                      <button
                        onClick={handleVerify}
                        disabled={verifyCode.length !== 6 || isVerifying}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                      >
                        {isVerifying ? '確認中...' : '確認'}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEnrollData(null);
                      setVerifyCode('');
                    }}
                    className="w-full py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* セキュリティのヒント */}
          <div className="bg-blue-50 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              セキュリティのヒント
            </h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• 認証アプリのバックアップコードは安全な場所に保管してください</li>
              <li>• 端末を紛失した場合に備え、複数の認証方法を設定することをお勧めします</li>
              <li>• パスワードは定期的に変更し、他のサービスと共有しないでください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
