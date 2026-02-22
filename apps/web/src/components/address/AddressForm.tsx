'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createAddressAction } from '@/lib/actions';
import type { Address } from '@/types';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { PREFECTURES } from './prefectures';
import { COUNTRIES } from './countries';
import {
  validatePostalCode,
  validateCity,
  validateAddressLine1,
  validateAddressLine2,
  validateLabel,
  validatePhoneStrict,
  validateRequired,
  sanitizeAddressInput,
} from '@/lib/validation';

export function AddressForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = (pathname?.split('/')[1] as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);
  const { t } = useTranslation('account');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams?.get('redirect') || routes.ACCOUNT.ADDRESSES;

  const [formData, setFormData] = useState<Omit<Address, 'id'>>({
    name: '',
    country: 'JP',
    postal_code: '',
    prefecture: '',
    city: '',
    address_line1: '',
    address_line2: '',
    phone: '',
    is_default: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const sanitizedData = {
        ...formData,
        name: sanitizeAddressInput(formData.name || ''),
        postal_code: sanitizeAddressInput(formData.postal_code),
        prefecture: sanitizeAddressInput(formData.prefecture),
        city: sanitizeAddressInput(formData.city),
        address_line1: sanitizeAddressInput(formData.address_line1),
        address_line2: sanitizeAddressInput(formData.address_line2 || ''),
        phone: sanitizeAddressInput(formData.phone || ''),
      };

      // 日本の場合のみ郵便番号バリデーション
      if (sanitizedData.country === 'JP') {
        const postalCodeError = validatePostalCode(sanitizedData.postal_code);
        if (postalCodeError) {
          setError(postalCodeError);
          setIsSubmitting(false);
          return;
        }
      }

      // 都道府県/州のバリデーション
      const prefectureError = validateRequired(sanitizedData.prefecture, t('addresses.form.prefecture'));
      if (prefectureError) {
        setError(prefectureError);
        setIsSubmitting(false);
        return;
      }

      const cityError = validateCity(sanitizedData.city);
      if (cityError) {
        setError(cityError);
        setIsSubmitting(false);
        return;
      }

      const addressLine1Error = validateAddressLine1(sanitizedData.address_line1);
      if (addressLine1Error) {
        setError(addressLine1Error);
        setIsSubmitting(false);
        return;
      }

      if (sanitizedData.address_line2) {
        const addressLine2Error = validateAddressLine2(sanitizedData.address_line2);
        if (addressLine2Error) {
          setError(addressLine2Error);
          setIsSubmitting(false);
          return;
        }
      }

      if (sanitizedData.name) {
        const labelError = validateLabel(sanitizedData.name);
        if (labelError) {
          setError(labelError);
          setIsSubmitting(false);
          return;
        }
      }

      if (sanitizedData.phone) {
        const phoneError = validatePhoneStrict(sanitizedData.phone);
        if (phoneError) {
          setError(phoneError);
          setIsSubmitting(false);
          return;
        }
      }

      // 日本の場合のみ郵便番号を正規化
      let finalPostalCode = sanitizedData.postal_code;
      if (sanitizedData.country === 'JP') {
        const normalizedPostalCode = sanitizedData.postal_code.replace(/-/g, '');
        finalPostalCode = normalizedPostalCode.length === 7
          ? `${normalizedPostalCode.slice(0, 3)}-${normalizedPostalCode.slice(3)}`
          : sanitizedData.postal_code;
      }

      const finalData = {
        ...sanitizedData,
        postal_code: finalPostalCode,
        name: sanitizedData.name || undefined,
        address_line2: sanitizedData.address_line2 || undefined,
        phone: sanitizedData.phone || undefined,
      };

      const result = await createAddressAction(finalData);
      if (!result.success) {
        setError(result.error || t('addresses.form.submit'));
        setIsSubmitting(false);
        return;
      }
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('addresses.form.submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const sanitizedValue = type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : name === 'country'
        ? value
        : sanitizeAddressInput(value);

    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue,
      // 国が変わったら都道府県をリセット
      ...(name === 'country' ? { prefecture: '' } : {}),
    }));
  };

  return (
    <div className="min-h-screen bg-bg-light pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 md:p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-primary" />
              <p className="text-xs tracking-[0.2em] text-primary uppercase font-bold">{t('addresses.sectionLabel')}</p>
            </div>
            <h1 className="text-xl text-text-dark" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>{t('addresses.addTitle')}</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-text-dark mb-2">{t('addresses.form.label')}</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder={t('addresses.form.labelPlaceholder')} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
            </div>

            <div>
              <label htmlFor="country" className="block text-xs font-bold text-text-dark mb-2">{t('addresses.form.country')} <span className="text-red-500">*</span></label>
              <select id="country" name="country" value={formData.country} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm bg-white text-text-dark">
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name[locale as keyof typeof country.name] || country.name.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="postal_code" className="block text-xs font-bold text-text-dark mb-2">{t('addresses.form.postalCode')} <span className="text-red-500">*</span></label>
              <input type="text" id="postal_code" name="postal_code" value={formData.postal_code} onChange={handleChange} placeholder={formData.country === 'JP' ? t('addresses.form.postalCodePlaceholder') : t('addresses.form.postalCodeIntlPlaceholder')} maxLength={formData.country === 'JP' ? 8 : 20} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
            </div>

            <div>
              <label htmlFor="prefecture" className="block text-xs font-bold text-text-dark mb-2">{formData.country === 'JP' ? t('addresses.form.prefecture') : t('addresses.form.stateProvince')} <span className="text-red-500">*</span></label>
              {formData.country === 'JP' ? (
                <select id="prefecture" name="prefecture" value={formData.prefecture} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm bg-white text-text-dark">
                  <option value="">{t('addresses.form.prefectureSelect')}</option>
                  {PREFECTURES.map((pref) => (<option key={pref} value={pref}>{pref}</option>))}
                </select>
              ) : (
                <input type="text" id="prefecture" name="prefecture" value={formData.prefecture} onChange={handleChange} placeholder={t('addresses.form.stateProvincePlaceholder')} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
              )}
            </div>

            <div>
              <label htmlFor="city" className="block text-xs font-bold text-text-dark mb-2">{t('addresses.form.city')} <span className="text-red-500">*</span></label>
              <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} placeholder={t('addresses.form.cityPlaceholder')} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
            </div>

            <div>
              <label htmlFor="address_line1" className="block text-xs font-bold text-text-dark mb-2">{t('addresses.form.addressLine1')} <span className="text-red-500">*</span></label>
              <input type="text" id="address_line1" name="address_line1" value={formData.address_line1} onChange={handleChange} placeholder={t('addresses.form.addressLine1Placeholder')} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
            </div>

            <div>
              <label htmlFor="address_line2" className="block text-xs font-bold text-text-dark mb-2">{t('addresses.form.addressLine2')}</label>
              <input type="text" id="address_line2" name="address_line2" value={formData.address_line2} onChange={handleChange} placeholder={t('addresses.form.addressLine2Placeholder')} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-text-dark mb-2">{t('addresses.form.phone')}</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder={t('addresses.form.phonePlaceholder')} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_default" name="is_default" checked={formData.is_default} onChange={handleChange} className="w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary text-primary" />
              <label htmlFor="is_default" className="text-sm font-bold text-text-dark cursor-pointer">{t('addresses.form.isDefault')}</label>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-700 text-xs">{error}</div>
            )}

            <div className="flex gap-4 pt-4">
              <Link href={redirectTo} className="flex-1 px-6 py-3 font-bold text-text-dark border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-center text-sm">{t('addresses.form.cancel')}</Link>
              <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-3 font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                {isSubmitting ? t('addresses.form.submitting') : t('addresses.form.submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
