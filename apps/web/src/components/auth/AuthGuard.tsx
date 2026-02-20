'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAddress?: boolean;
}

export function AuthGuard({ children, redirectTo, requireAddress = false }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = (pathname?.split('/')[1] as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);
  const finalRedirectTo = redirectTo || routes.AUTH.LOGIN;

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(finalRedirectTo);
        return;
      }

      if (requireAddress) {
        // 住所が必要な場合は、サーバーコンポーネントでチェックする
        // ここでは認証のみチェック
      }
    }
  }, [user, isLoading, router, finalRedirectTo, requireAddress]);

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

