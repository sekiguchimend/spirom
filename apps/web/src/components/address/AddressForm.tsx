'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createAddressAction } from '@/lib/actions';
import type { Address } from '@/types';
import { ROUTES } from '@/lib/routes';
import { ADDRESS_MESSAGES, VALIDATION_MESSAGES } from '@/lib/messages';
import { PREFECTURES } from './prefectures';
import {
  validatePostalCode,
  validatePrefecture,
  validateCity,
  validateAddressLine1,
  validateAddressLine2,
  validateLabel,
  validatePhoneStrict,
  sanitizeAddressInput,
} from '@/lib/validation';

export function AddressForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // どこから来たかで戻り先を変える（デフォルトは住所一覧）
  const redirectTo = searchParams?.get('redirect') || ROUTES.ACCOUNT.ADDRESSES;

  const [formData, setFormData] = useState<Omit<Address, 'id'>>({
    name: '',
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
      // 入力値のサニタイゼーション
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

      // バリデーション
      const postalCodeError = validatePostalCode(sanitizedData.postal_code);
      if (postalCodeError) {
        setError(postalCodeError);
        setIsSubmitting(false);
        return;
      }

      const prefectureError = validatePrefecture(sanitizedData.prefecture, PREFECTURES);
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

      // 郵便番号の正規化
      const normalizedPostalCode = sanitizedData.postal_code.replace(/-/g, '');
      const finalPostalCode = normalizedPostalCode.length === 7
        ? `${normalizedPostalCode.slice(0, 3)}-${normalizedPostalCode.slice(3)}`
        : sanitizedData.postal_code;

      const finalData = {
        ...sanitizedData,
        postal_code: finalPostalCode,
        name: sanitizedData.name || undefined,
        address_line2: sanitizedData.address_line2 || undefined,
        phone: sanitizedData.phone || undefined,
      };

      const result = await createAddressAction(finalData);
      if (!result.success) {
        setError(result.error || ADDRESS_MESSAGES.SAVE_FAILED);
        setIsSubmitting(false);
        return;
      }
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : ADDRESS_MESSAGES.SAVE_FAILED);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // 入力値をサニタイゼーション（リアルタイム）
    const sanitizedValue = type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : sanitizeAddressInput(value);
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue,
    }));
  };

  return (
    <div className="min-h-screen bg-bg-light pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 md:p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-primary" />
              <p className="text-xs tracking-[0.2em] text-primary uppercase font-bold">Address</p>
            </div>
            <h1 className="text-xl text-text-dark" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>配送先住所を追加</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-text-dark mb-2">ラベル（任意）</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="例: 自宅、会社など" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
            </div>

            <div>
              <label htmlFor="postal_code" className="block text-xs font-bold text-text-dark mb-2">郵便番号 <span className="text-red-500">*</span></label>
              <input type="text" id="postal_code" name="postal_code" value={formData.postal_code} onChange={handleChange} placeholder="1234567 または 123-4567" maxLength={8} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
            </div>

            <div>
              <label htmlFor="prefecture" className="block text-xs font-bold text-text-dark mb-2">都道府県 <span className="text-red-500">*</span></label>
              <select id="prefecture" name="prefecture" value={formData.prefecture} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm bg-white text-text-dark">
                <option value="">選択してください</option>
                {PREFECTURES.map((pref) => (<option key={pref} value={pref}>{pref}</option>))}
              </select>
            </div>

            <div>
              <label htmlFor="city" className="block text-xs font-bold text-text-dark mb-2">市区町村 <span className="text-red-500">*</span></label>
              <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} placeholder="例: 渋谷区" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
            </div>

            <div>
              <label htmlFor="address_line1" className="block text-xs font-bold text-text-dark mb-2">番地・建物名 <span className="text-red-500">*</span></label>
              <input type="text" id="address_line1" name="address_line1" value={formData.address_line1} onChange={handleChange} placeholder="例: 1-2-3" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
            </div>

            <div>
              <label htmlFor="address_line2" className="block text-xs font-bold text-text-dark mb-2">建物名・部屋番号（任意）</label>
              <input type="text" id="address_line2" name="address_line2" value={formData.address_line2} onChange={handleChange} placeholder="例: サンプルマンション101" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-text-dark mb-2">電話番号（任意）</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="例: 03-1234-5678" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm text-text-dark" />
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_default" name="is_default" checked={formData.is_default} onChange={handleChange} className="w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary text-primary" />
              <label htmlFor="is_default" className="text-sm font-bold text-text-dark cursor-pointer">この住所をデフォルトに設定する</label>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-700 text-xs">{error}</div>
            )}

            <div className="flex gap-4 pt-4">
              <Link href={redirectTo} className="flex-1 px-6 py-3 font-bold text-text-dark border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-center text-sm">キャンセル</Link>
              <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-3 font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                {isSubmitting ? '登録中...' : '住所を登録'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
