'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAddress?: boolean;
}

export function AuthGuard({ children, redirectTo = '/login', requireAddress = false }: AuthGuardProps) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user || !token) {
        router.push(redirectTo);
        return;
      }

      if (requireAddress) {
        // 住所が必要な場合は、サーバーコンポーネントでチェックする
        // ここでは認証のみチェック
      }
    }
  }, [user, token, isLoading, router, redirectTo, requireAddress]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#4a7c59] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !token) {
    return null;
  }

  return <>{children}</>;
}

