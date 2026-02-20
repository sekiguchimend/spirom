'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail, validateRequired } from '@/lib/validation';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SectionHeader } from '@/components/ui';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const pathname = usePathname();
  const langFromPath = pathname.split('/')[1] as Locale;
  const locale = langFromPath || defaultLocale;
  const routes = createLocalizedRoutes(locale);
  const { t } = useTranslation('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const validatePasswordField = (value: string): string | undefined => {
    if (!value) return t('validation.required');
    return undefined;
  };

  const validateEmailField = (value: string): string | undefined => {
    const required = validateRequired(value);
    if (required) return t('validation.required');
    const emailError = validateEmail(value);
    if (emailError) return t('validation.emailInvalid');
    return undefined;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    const error = validateEmailField(value);
    setFieldErrors(prev => ({ ...prev, email: error }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const error = validatePasswordField(value);
    setFieldErrors(prev => ({ ...prev, password: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: FieldErrors = {
      email: validateEmailField(email),
      password: validatePasswordField(password),
    };
    setFieldErrors(errors);

    if (Object.values(errors).some(err => err !== undefined)) {
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      router.push(routes.HOME);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-primary/5 rounded-2xl p-6 md:p-8">
          <div className="mb-6">
            <SectionHeader
              label={t('login.sectionLabel')}
              title={t('login.title')}
              titleStyle={{ fontWeight: 900, WebkitTextStroke: '1px currentColor', fontSize: '1.5rem' }}
            />
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('login.noAccount')}{' '}
              <Link href={routes.AUTH.REGISTER} className="font-medium text-primary hover:text-primary-dark">
                {t('login.registerLink')}
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
                <label htmlFor="email" className="block text-xs font-bold text-text-dark mb-2">
                  {t('login.email')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={`appearance-none relative block w-full px-4 py-3 border-2 placeholder-gray-400 text-text-dark rounded-xl focus:outline-none text-sm transition-colors ${
                    fieldErrors.email
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-gray-200 focus:border-primary'
                  }`}
                  placeholder={t('login.placeholder.email')}
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-text-dark mb-2">
                  {t('login.password')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className={`appearance-none relative block w-full px-4 py-3 border-2 placeholder-gray-400 text-text-dark rounded-xl focus:outline-none text-sm transition-colors ${
                    fieldErrors.password
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-gray-200 focus:border-primary'
                  }`}
                  placeholder={t('login.placeholder.password')}
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
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-full text-white bg-primary hover:bg-primary-dark focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                {isLoading ? t('login.submitting') : t('login.submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
