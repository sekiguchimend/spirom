'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui';
import { ROUTES } from '@/lib/routes';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAddress?: boolean;
}

export function AuthGuard({ children, redirectTo = ROUTES.AUTH.LOGIN, requireAddress = false }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(redirectTo);
        return;
      }

      if (requireAddress) {
        // 住所が必要な場合は、サーバーコンポーネントでチェックする
        // ここでは認証のみチェック
      }
    }
  }, [user, isLoading, router, redirectTo, requireAddress]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

