'use client';

import { useState } from 'react';
import type { GuestShippingAddress } from '@/types';
import { PREFECTURES } from '@/components/address/prefectures';
import {
  validatePostalCode,
  validatePrefecture,
  validateCity,
  validateAddressLine1,
  validateAddressLine2,
  validatePhoneStrict,
  validateRequired,
  validateEmail,
  sanitizeAddressInput,
} from '@/lib/validation';

interface GuestAddressFormProps {
  onSubmit: (address: GuestShippingAddress, email?: string) => void;
  isSubmitting: boolean;
  error?: string | null;
}

export function GuestAddressForm({ onSubmit, isSubmitting, error: externalError }: GuestAddressFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<GuestShippingAddress & { email?: string }>({
    name: '',
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

    const postalCodeError = validatePostalCode(sanitizedData.postal_code);
    if (postalCodeError) {
      setError(postalCodeError);
      return;
    }

    const prefectureError = validatePrefecture(sanitizedData.prefecture, PREFECTURES);
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

    // 郵便番号の正規化
    const normalizedPostalCode = sanitizedData.postal_code.replace(/-/g, '');
    const finalPostalCode = normalizedPostalCode.length === 7
      ? `${normalizedPostalCode.slice(0, 3)}-${normalizedPostalCode.slice(3)}`
      : sanitizedData.postal_code;

    const finalAddress: GuestShippingAddress = {
      name: sanitizedData.name,
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
    const sanitizedValue = name === 'email' ? value : sanitizeAddressInput(value);

    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue,
    }));
  };

  const displayError = error || externalError;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4 p-3 bg-primary/5 rounded-xl">
        <p className="text-xs text-gray-600">
          アカウント登録なしでご購入いただけます。
          メールアドレスを入力すると、注文確認リンクをお送りします（任意）。
        </p>
      </div>

      <div>
        <label htmlFor="name" className="block text-xs font-bold text-text-dark mb-2">
          お名前 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="例: 山田 太郎"
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
      </div>

      <div>
        <label htmlFor="postal_code" className="block text-xs font-bold text-text-dark mb-2">
          郵便番号 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="postal_code"
          name="postal_code"
          value={formData.postal_code}
          onChange={handleChange}
          placeholder="1234567 または 123-4567"
          maxLength={8}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
      </div>

      <div>
        <label htmlFor="prefecture" className="block text-xs font-bold text-text-dark mb-2">
          都道府県 <span className="text-red-500">*</span>
        </label>
        <select
          id="prefecture"
          name="prefecture"
          value={formData.prefecture}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm bg-white text-text-dark"
        >
          <option value="">選択してください</option>
          {PREFECTURES.map((pref) => (
            <option key={pref} value={pref}>{pref}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="city" className="block text-xs font-bold text-text-dark mb-2">
          市区町村 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="city"
          name="city"
          value={formData.city}
          onChange={handleChange}
          placeholder="例: 渋谷区"
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
      </div>

      <div>
        <label htmlFor="address_line1" className="block text-xs font-bold text-text-dark mb-2">
          番地 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="address_line1"
          name="address_line1"
          value={formData.address_line1}
          onChange={handleChange}
          placeholder="例: 1-2-3"
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
      </div>

      <div>
        <label htmlFor="address_line2" className="block text-xs font-bold text-text-dark mb-2">
          建物名・部屋番号（任意）
        </label>
        <input
          type="text"
          id="address_line2"
          name="address_line2"
          value={formData.address_line2}
          onChange={handleChange}
          placeholder="例: サンプルマンション101"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-xs font-bold text-text-dark mb-2">
          電話番号 <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="例: 03-1234-5678"
          required
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
      </div>

      <div className="border-t border-gray-100 pt-4 mt-4">
        <label htmlFor="email" className="block text-xs font-bold text-text-dark mb-2">
          メールアドレス（任意）
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email || ''}
          onChange={handleChange}
          placeholder="例: example@email.com"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark"
        />
        <p className="text-xs text-gray-500 mt-1">
          入力すると注文確認リンクをメールでお送りします
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
        {isSubmitting ? '処理中...' : '住所を確認して決済へ進む'}
      </button>
    </form>
  );
}
