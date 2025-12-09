'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type PaymentStatus = 'loading' | 'succeeded' | 'processing' | 'failed';

export default function CheckoutCompletePage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');
    const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
    const redirectStatus = searchParams.get('redirect_status');
    const orderIdParam = searchParams.get('order_id');

    setOrderId(orderIdParam);

    // Stripeからのリダイレクト結果をチェック
    if (redirectStatus === 'succeeded') {
      setStatus('succeeded');
    } else if (redirectStatus === 'processing') {
      setStatus('processing');
    } else if (redirectStatus === 'failed') {
      setStatus('failed');
    } else {
      // パラメータがない場合はエラー扱い
      setStatus('failed');
    }
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FFFFF5] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-3 sm:border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4 sm:mb-6" />
          <p className="font-black text-base sm:text-xl uppercase tracking-wider text-black">
            決済結果を確認中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-8 sm:py-20">
        {status === 'succeeded' && (
          <div className="bg-white border-3 sm:border-4 border-black rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
            {/* 成功アイコン */}
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-[#7dff3a] border-3 sm:border-4 border-black rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 sm:w-12 sm:h-12"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-black mb-2 sm:mb-4 tracking-wide text-black"
              style={{ fontFamily: 'var(--font-anton), sans-serif' }}
            >
              THANK YOU!
            </h1>
            <p className="text-base sm:text-xl font-bold text-gray-600 mb-5 sm:mb-8">
              ご注文ありがとうございます
            </p>

            {orderId && (
              <div className="bg-gray-50 border-2 sm:border-3 border-black rounded-lg sm:rounded-xl p-3 sm:p-4 mb-5 sm:mb-8">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">注文ID</p>
                <p className="font-mono font-bold text-sm sm:text-base break-all">{orderId}</p>
              </div>
            )}

            <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-8">
              ご注文の確認メールをお送りしました。
              <br />
              商品の発送準備ができ次第、発送通知をお送りします。
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="/account/orders"
                className="px-5 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-black uppercase tracking-wider bg-black text-white border-3 sm:border-4 border-black rounded-lg sm:rounded-xl shadow-[4px_4px_0px_0px_rgba(125,255,58,1)] sm:shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[6px_6px_0px_0px_rgba(125,255,58,1)] sm:hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
              >
                注文履歴を見る
              </Link>
              <Link
                href="/"
                className="px-5 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-black uppercase tracking-wider bg-white text-black border-3 sm:border-4 border-black rounded-lg sm:rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
              >
                トップへ戻る
              </Link>
            </div>
          </div>
        )}

        {status === 'processing' && (
          <div className="bg-white border-3 sm:border-4 border-black rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
            {/* 処理中アイコン */}
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-yellow-100 border-3 sm:border-4 border-black rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 sm:w-12 sm:h-12 animate-spin"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>

            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-black mb-2 sm:mb-4 tracking-wide text-black"
              style={{ fontFamily: 'var(--font-anton), sans-serif' }}
            >
              PROCESSING
            </h1>
            <p className="text-base sm:text-xl font-bold text-gray-600 mb-5 sm:mb-8">
              決済処理中です
            </p>

            <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-8">
              決済処理が完了次第、確認メールをお送りします。
              <br />
              しばらくお待ちください。
            </p>

            <Link
              href="/"
              className="inline-block px-5 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-black uppercase tracking-wider bg-white text-black border-3 sm:border-4 border-black rounded-lg sm:rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
            >
              トップへ戻る
            </Link>
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-white border-3 sm:border-4 border-black rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
            {/* 失敗アイコン */}
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-red-100 border-3 sm:border-4 border-red-500 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-8 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)] sm:shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 sm:w-12 sm:h-12 text-red-500"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </div>

            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-black mb-2 sm:mb-4 tracking-wide text-red-500"
              style={{ fontFamily: 'var(--font-anton), sans-serif' }}
            >
              PAYMENT FAILED
            </h1>
            <p className="text-base sm:text-xl font-bold text-gray-600 mb-5 sm:mb-8">
              決済に失敗しました
            </p>

            <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-8">
              カード情報をご確認の上、再度お試しください。
              <br />
              問題が解決しない場合は、お問い合わせください。
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="/checkout"
                className="px-5 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-black uppercase tracking-wider bg-black text-white border-3 sm:border-4 border-black rounded-lg sm:rounded-xl shadow-[4px_4px_0px_0px_rgba(125,255,58,1)] sm:shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[6px_6px_0px_0px_rgba(125,255,58,1)] sm:hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
              >
                再度試す
              </Link>
              <Link
                href="/contact"
                className="px-5 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-black uppercase tracking-wider bg-white text-black border-3 sm:border-4 border-black rounded-lg sm:rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
              >
                お問い合わせ
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
