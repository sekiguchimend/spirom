'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { GuestShippingAddress } from '@/types';
import { PREFECTURES } from '@/components/address/prefectures';
import { COUNTRIES } from '@/components/address/countries';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import {
  validatePostalCode,
  validateCity,
  validateAddressLine1,
  validateAddressLine2,
  validatePhoneStrict,
  validateRequired,
  validateEmail,
  sanitizeAddressInput,
} from '@/lib/validation';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface GuestAddressFormProps {
  onSubmit: (address: GuestShippingAddress, email?: string) => void;
  onCountryChange?: (countryCode: string) => void;
  isSubmitting: boolean;
  error?: string | null;
}

export function GuestAddressForm({ onSubmit, onCountryChange, isSubmitting, error: externalError }: GuestAddressFormProps) {
  const { t } = useTranslation('common');
  const pathname = usePathname();
  const locale = (pathname?.split('/')[1] as Locale) || defaultLocale;
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<GuestShippingAddress & { email?: string }>({
    name: '',
    country: 'JP',
    postal_code: '',
    prefecture: '',
    city: '',
    address_line1: '',
    address_line2: '',
    phone: '',
    email: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 入力値のサニタイゼーション
    const sanitizedData = {
      ...formData,
      name: sanitizeAddressInput(formData.name),
      postal_code: sanitizeAddressInput(formData.postal_code),
      prefecture: sanitizeAddressInput(formData.prefecture),
      city: sanitizeAddressInput(formData.city),
      address_line1: sanitizeAddressInput(formData.address_line1),
      address_line2: sanitizeAddressInput(formData.address_line2 || ''),
      phone: sanitizeAddressInput(formData.phone),
      email: formData.email?.trim(),
    };

    // バリデーション
    const nameError = validateRequired(sanitizedData.name, '名前');
    if (nameError) {
      setError(nameError);
      return;
    }

    // 日本の場合のみ郵便番号バリデーション
    if (sanitizedData.country === 'JP') {
      const postalCodeError = validatePostalCode(sanitizedData.postal_code);
      if (postalCodeError) {
        setError(postalCodeError);
        return;
      }
    }

    // 都道府県/州のバリデーション
    const prefectureError = validateRequired(sanitizedData.prefecture, t('form.prefecture'));
    if (prefectureError) {
      setError(prefectureError);
      return;
    }

    const cityError = validateCity(sanitizedData.city);
    if (cityError) {
      setError(cityError);
      return;
    }

    const addressLine1Error = validateAddressLine1(sanitizedData.address_line1);
    if (addressLine1Error) {
      setError(addressLine1Error);
      return;
    }

    if (sanitizedData.address_line2) {
      const addressLine2Error = validateAddressLine2(sanitizedData.address_line2);
      if (addressLine2Error) {
        setError(addressLine2Error);
        return;
      }
    }

    const phoneError = validatePhoneStrict(sanitizedData.phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    // メールアドレスのバリデーション（入力されている場合のみ）
    if (sanitizedData.email) {
      const emailError = validateEmail(sanitizedData.email);
      if (emailError) {
        setError(emailError);
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

    const finalAddress: GuestShippingAddress = {
      name: sanitizedData.name,
      country: sanitizedData.country,
      postal_code: finalPostalCode,
      prefecture: sanitizedData.prefecture,
      city: sanitizedData.city,
      address_line1: sanitizedData.address_line1,
      address_line2: sanitizedData.address_line2 || undefined,
      phone: sanitizedData.phone,
    };

    onSubmit(finalAddress, sanitizedData.email || undefined);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // 入力値をサニタイゼーション（リアルタイム）
    const sanitizedValue = name === 'email' || name === 'country' ? value : sanitizeAddressInput(value);

    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue,
      // 国が変わったら都道府県をリセット
      ...(name === 'country' ? { prefecture: '' } : {}),
    }));

    // 国が変更された場合、親コンポーネントに通知
    if (name === 'country' && onCountryChange) {
      onCountryChange(value);
    }
  };

  const displayError = error || externalError;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4 p-3 bg-primary/5 rounded-xl">
        <p className="text-xs text-gray-600">
          {t('checkout.guestCheckoutDesc')}
        </p>
      </div>

      <div>
        <label htmlFor="name" className="block text-xs font-bold text-text-dark mb-2">
          {t('form.name')} <span className="text-red-500">{t('form.required')}</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder={t('form.placeholderName')}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
      </div>

      <div>
        <label htmlFor="country" className="block text-xs font-bold text-text-dark mb-2">
          {t('form.country')} <span className="text-red-500">{t('form.required')}</span>
        </label>
        <select
          id="country"
          name="country"
          value={formData.country}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm bg-white text-text-dark"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name[locale as keyof typeof country.name] || country.name.en}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="postal_code" className="block text-xs font-bold text-text-dark mb-2">
          {t('form.postalCode')} <span className="text-red-500">{t('form.required')}</span>
        </label>
        <input
          type="text"
          id="postal_code"
          name="postal_code"
          value={formData.postal_code}
          onChange={handleChange}
          placeholder={formData.country === 'JP' ? t('form.placeholderPostalCode') : t('form.placeholderPostalCodeIntl')}
          maxLength={formData.country === 'JP' ? 8 : 20}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
      </div>

      <div>
        <label htmlFor="prefecture" className="block text-xs font-bold text-text-dark mb-2">
          {formData.country === 'JP' ? t('form.prefecture') : t('form.stateProvince')} <span className="text-red-500">{t('form.required')}</span>
        </label>
        {formData.country === 'JP' ? (
          <select
            id="prefecture"
            name="prefecture"
            value={formData.prefecture}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm bg-white text-text-dark"
          >
            <option value="">{t('form.selectPrefecture')}</option>
            {PREFECTURES.map((pref) => (
              <option key={pref} value={pref}>{pref}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            id="prefecture"
            name="prefecture"
            value={formData.prefecture}
            onChange={handleChange}
            placeholder={t('form.placeholderStateProvince')}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
          />
        )}
      </div>

      <div>
        <label htmlFor="city" className="block text-xs font-bold text-text-dark mb-2">
          {t('form.city')} <span className="text-red-500">{t('form.required')}</span>
        </label>
        <input
          type="text"
          id="city"
          name="city"
          value={formData.city}
          onChange={handleChange}
          placeholder={t('form.placeholderCity')}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
      </div>

      <div>
        <label htmlFor="address_line1" className="block text-xs font-bold text-text-dark mb-2">
          {t('form.addressLine1')} <span className="text-red-500">{t('form.required')}</span>
        </label>
        <input
          type="text"
          id="address_line1"
          name="address_line1"
          value={formData.address_line1}
          onChange={handleChange}
          placeholder={t('form.placeholderAddress1')}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
      </div>

      <div>
        <label htmlFor="address_line2" className="block text-xs font-bold text-text-dark mb-2">
          {t('form.addressLine2')}
        </label>
        <input
          type="text"
          id="address_line2"
          name="address_line2"
          value={formData.address_line2}
          onChange={handleChange}
          placeholder={t('form.placeholderAddress2')}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-xs font-bold text-text-dark mb-2">
          {t('form.phone')} <span className="text-red-500">{t('form.required')}</span>
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder={t('form.placeholderPhone')}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
      </div>

      <div className="border-t border-gray-100 pt-4 mt-4">
        <label htmlFor="email" className="block text-xs font-bold text-text-dark mb-2">
          {t('form.email')}
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email || ''}
          onChange={handleChange}
          placeholder={t('form.placeholderEmail')}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('checkout.emailConfirmNote')}
        </p>
      </div>

      {displayError && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-700 text-xs">
          {displayError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-3 font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {isSubmitting ? t('checkout.processing') : t('checkout.confirmAddressAndProceed')}
      </button>
    </form>
  );
}
