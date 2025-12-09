'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type PaymentStatus = 'loading' | 'succeeded' | 'processing' | 'failed';

function CheckoutCompleteContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const redirectStatus = searchParams.get('redirect_status');
    const orderIdParam = searchParams.get('order_id');

    setOrderId(orderIdParam);

    if (redirectStatus === 'succeeded') {
      setStatus('succeeded');
    } else if (redirectStatus === 'processing') {
      setStatus('processing');
    } else if (redirectStatus === 'failed') {
      setStatus('failed');
    } else {
      setStatus('failed');
    }
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#4a7c59] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-[#323232]">確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        {status === 'succeeded' && (
          <div className="bg-[#4a7c59] rounded-3xl p-8 text-center">
            <div className="w-20 h-20 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-10 h-10"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <p className="text-xs tracking-[0.2em] text-white/70 uppercase mb-2 font-bold">Order Complete</p>
            <h1 className="text-3xl font-black mb-2 text-white">THANK YOU!</h1>
            <p className="text-white/80 font-medium mb-8">ご注文ありがとうございます</p>

            {orderId && (
              <div className="bg-white/10 rounded-xl p-4 mb-8 text-left">
                <p className="text-xs text-white/60 mb-1 font-medium">注文ID</p>
                <p className="font-mono font-bold text-white text-sm break-all">{orderId}</p>
              </div>
            )}

            <p className="text-sm text-white/80 mb-8">
              確認メールをお送りしました。<br />
              発送準備ができ次第、通知いたします。
            </p>

            <div className="space-y-3">
              <Link
                href="/"
                className="block w-full py-4 bg-white text-[#4a7c59] font-bold text-sm tracking-wider rounded-full hover:bg-white/90 transition-colors"
              >
                トップへ戻る
              </Link>
              <Link
                href="/products"
                className="block w-full py-3 text-white/80 font-bold text-sm hover:text-white transition-colors"
              >
                買い物を続ける
              </Link>
            </div>
          </div>
        )}

        {status === 'processing' && (
          <div className="bg-[#4a7c59] rounded-3xl p-8 text-center">
            <div className="w-20 h-20 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-10 h-10 animate-spin"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>

            <p className="text-xs tracking-[0.2em] text-white/70 uppercase mb-2 font-bold">Processing</p>
            <h1 className="text-3xl font-black mb-2 text-white">処理中</h1>
            <p className="text-white/80 font-medium mb-8">決済を処理しています</p>

            <p className="text-sm text-white/80 mb-8">
              完了次第、確認メールをお送りします。<br />
              しばらくお待ちください。
            </p>

            <Link
              href="/"
              className="block w-full py-4 bg-white text-[#4a7c59] font-bold text-sm tracking-wider rounded-full hover:bg-white/90 transition-colors"
            >
              トップへ戻る
            </Link>
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-[#4a7c59] rounded-3xl p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-10 h-10"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </div>

            <p className="text-xs tracking-[0.2em] text-white/70 uppercase mb-2 font-bold">Payment Failed</p>
            <h1 className="text-3xl font-black mb-2 text-white">エラー</h1>
            <p className="text-white/80 font-medium mb-8">決済に失敗しました</p>

            <p className="text-sm text-white/80 mb-8">
              カード情報をご確認の上、<br />
              再度お試しください。
            </p>

            <div className="space-y-3">
              <Link
                href="/cart"
                className="block w-full py-4 bg-white text-[#4a7c59] font-bold text-sm tracking-wider rounded-full hover:bg-white/90 transition-colors"
              >
                カートに戻る
              </Link>
              <Link
                href="/"
                className="block w-full py-3 text-white/80 font-bold text-sm hover:text-white transition-colors"
              >
                トップへ戻る
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutCompleteLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#4a7c59] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-bold text-[#323232]">読み込み中...</p>
      </div>
    </div>
  );
}

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<CheckoutCompleteLoading />}>
      <CheckoutCompleteContent />
    </Suspense>
  );
}
