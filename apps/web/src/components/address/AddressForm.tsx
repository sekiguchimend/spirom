'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createAddressAction, type Address } from '@/lib/actions';

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

export function AddressForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (!formData.postal_code || !formData.prefecture || !formData.city || !formData.address_line1) {
        setError('必須項目を入力してください');
        setIsSubmitting(false);
        return;
      }

      const postalCodeRegex = /^\d{7}$|^\d{3}-\d{4}$/;
      if (!postalCodeRegex.test(formData.postal_code.replace(/-/g, ''))) {
        setError('郵便番号は7桁で入力してください');
        setIsSubmitting(false);
        return;
      }

      const normalizedPostalCode = formData.postal_code.replace(/-/g, '');
      if (normalizedPostalCode.length === 7) {
        formData.postal_code = `${normalizedPostalCode.slice(0, 3)}-${normalizedPostalCode.slice(3)}`;
      }

      const result = await createAddressAction(formData);
      if (!result.success) {
        setError(result.error || '住所の登録に失敗しました');
        setIsSubmitting(false);
        return;
      }
      router.push('/checkout');
    } catch (err) {
      console.error('住所登録エラー:', err);
      setError(err instanceof Error ? err.message : '住所の登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 md:p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-[#4a7c59]" />
              <p className="text-xs tracking-[0.2em] text-[#4a7c59] uppercase font-bold">Address</p>
            </div>
            <h1 className="text-xl text-[#323232]" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>配送先住所を追加</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-[#323232] mb-2">ラベル（任意）</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="例: 自宅、会社など" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#4a7c59] transition-colors text-sm" />
            </div>

            <div>
              <label htmlFor="postal_code" className="block text-xs font-bold text-[#323232] mb-2">郵便番号 <span className="text-red-500">*</span></label>
              <input type="text" id="postal_code" name="postal_code" value={formData.postal_code} onChange={handleChange} placeholder="1234567 または 123-4567" maxLength={8} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#4a7c59] transition-colors text-sm" />
            </div>

            <div>
              <label htmlFor="prefecture" className="block text-xs font-bold text-[#323232] mb-2">都道府県 <span className="text-red-500">*</span></label>
              <select id="prefecture" name="prefecture" value={formData.prefecture} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#4a7c59] transition-colors text-sm bg-white">
                <option value="">選択してください</option>
                {PREFECTURES.map((pref) => (<option key={pref} value={pref}>{pref}</option>))}
              </select>
            </div>

            <div>
              <label htmlFor="city" className="block text-xs font-bold text-[#323232] mb-2">市区町村 <span className="text-red-500">*</span></label>
              <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} placeholder="例: 渋谷区" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#4a7c59] transition-colors text-sm" />
            </div>

            <div>
              <label htmlFor="address_line1" className="block text-xs font-bold text-[#323232] mb-2">番地・建物名 <span className="text-red-500">*</span></label>
              <input type="text" id="address_line1" name="address_line1" value={formData.address_line1} onChange={handleChange} placeholder="例: 1-2-3" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#4a7c59] transition-colors text-sm" />
            </div>

            <div>
              <label htmlFor="address_line2" className="block text-xs font-bold text-[#323232] mb-2">建物名・部屋番号（任意）</label>
              <input type="text" id="address_line2" name="address_line2" value={formData.address_line2} onChange={handleChange} placeholder="例: サンプルマンション101" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#4a7c59] transition-colors text-sm" />
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-[#323232] mb-2">電話番号（任意）</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="例: 03-1234-5678" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#4a7c59] transition-colors text-sm" />
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_default" name="is_default" checked={formData.is_default} onChange={handleChange} className="w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#4a7c59] text-[#4a7c59]" />
              <label htmlFor="is_default" className="text-sm font-bold text-[#323232] cursor-pointer">この住所をデフォルトに設定する</label>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-700 text-xs">{error}</div>
            )}

            <div className="flex gap-4 pt-4">
              <Link href="/checkout" className="flex-1 px-6 py-3 font-bold text-[#323232] border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-center text-sm">キャンセル</Link>
              <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-3 font-bold bg-[#4a7c59] text-white rounded-xl hover:bg-[#3d6a4a] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                {isSubmitting ? '登録中...' : '住所を登録'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
