'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail, validateRequired, VALIDATION_PATTERNS } from '@/lib/validation';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SectionHeader } from '@/components/ui';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
}

export default function RegisterPage() {
  const pathname = usePathname();
  const langFromPath = pathname.split('/')[1] as Locale;
  const locale = langFromPath || defaultLocale;
  const routes = createLocalizedRoutes(locale);
  const { t } = useTranslation('auth');

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
    if (!value) return t('validation.required');
    if (value.trim().length < 2) return t('validation.nameMinLength');
    return undefined;
  };

  const validatePasswordField = (value: string): string | undefined => {
    if (!value) return t('validation.required');
    if (value.length < 8) return t('validation.passwordMinLength');
    if (!/[A-Za-z]/.test(value)) return t('validation.passwordRequireLetter');
    if (!/[0-9]/.test(value)) return t('validation.passwordRequireNumber');
    return undefined;
  };

  const validateEmailField = (value: string): string | undefined => {
    const required = validateRequired(value);
    if (required) return t('validation.required');
    const emailError = validateEmail(value);
    if (emailError) return t('validation.emailInvalid');
    return undefined;
  };

  const validatePhoneField = (value: string): string | undefined => {
    if (!value) return t('validation.required');
    if (!VALIDATION_PATTERNS.PHONE.test(value.replace(/\s/g, ''))) {
      return t('validation.phoneInvalid');
    }
    return undefined;
  };

  const handleNameChange = (value: string) => {
    setName(value);
    const error = validateName(value);
    setFieldErrors(prev => ({ ...prev, name: error }));
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

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    const error = validatePhoneField(value);
    setFieldErrors(prev => ({ ...prev, phone: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: FieldErrors = {
      name: validateName(name),
      email: validateEmailField(email),
      password: validatePasswordField(password),
      phone: validatePhoneField(phone),
    };
    setFieldErrors(errors);

    if (Object.values(errors).some(err => err !== undefined)) {
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name, phone);
      router.push(routes.ACCOUNT.NEW_ADDRESS);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('register.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-primary/5 rounded-2xl p-6 md:p-8">
          <div className="mb-6">
            <SectionHeader
              label={t('register.sectionLabel')}
              title={t('register.title')}
              titleStyle={{ fontWeight: 900, WebkitTextStroke: '1px currentColor', fontSize: '1.5rem' }}
            />
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('register.hasAccount')}{' '}
              <Link href={routes.AUTH.LOGIN} className="font-medium text-primary hover:text-primary-dark">
                {t('register.loginLink')}
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
                <label htmlFor="name" className="block text-xs font-bold text-text-dark mb-2">
                  {t('register.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className={`appearance-none relative block w-full px-4 py-3 border-2 placeholder-gray-400 text-text-dark rounded-xl focus:outline-none text-sm transition-colors ${
                    fieldErrors.name
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-gray-200 focus:border-primary'
                  }`}
                  placeholder={t('register.placeholder.name')}
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.name}</p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-text-dark mb-2">
                  {t('register.email')} <span className="text-red-500">*</span>
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
                  placeholder={t('register.placeholder.email')}
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-text-dark mb-2">
                  {t('register.password')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  className={`appearance-none relative block w-full px-4 py-3 border-2 placeholder-gray-400 text-text-dark rounded-xl focus:outline-none text-sm transition-colors ${
                    fieldErrors.password
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-gray-200 focus:border-primary'
                  }`}
                  placeholder={t('register.placeholder.password')}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.password}</p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-text-dark mb-2">
                  {t('register.phone')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className={`appearance-none relative block w-full px-4 py-3 border-2 placeholder-gray-400 text-text-dark rounded-xl focus:outline-none text-sm transition-colors ${
                    fieldErrors.phone
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-gray-200 focus:border-primary'
                  }`}
                  placeholder={t('register.placeholder.phone')}
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
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-full text-white bg-primary hover:bg-primary-dark focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                {isLoading ? t('register.submitting') : t('register.submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
