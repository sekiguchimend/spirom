'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { ProductVariant } from '@/types';

interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  is_active: boolean;
  product_type?: string;
  material?: string;
  material_detail?: string;
  created_at: string;
  updated_at?: string;
}

// Tシャツのデフォルトサイズ情報
const TSHIRT_SIZES = [
  { size: 'S', body_length: 66, body_width: 49, shoulder_width: 44, sleeve_length: 19 },
  { size: 'M', body_length: 70, body_width: 52, shoulder_width: 47, sleeve_length: 20 },
  { size: 'L', body_length: 74, body_width: 55, shoulder_width: 50, sleeve_length: 22 },
  { size: 'XL', body_length: 78, body_width: 58, shoulder_width: 53, sleeve_length: 24 },
  { size: 'XXL', body_length: 82, body_width: 61, shoulder_width: 56, sleeve_length: 26 },
  { size: 'XXXL', body_length: 84, body_width: 64, shoulder_width: 59, sleeve_length: 26 },
];

const TSHIRT_MATERIAL = {
  material: '綿100％',
  material_detail: `※杢グレー：綿80％、ポリエステル20％
※アッシュ：綿95％、ポリエステル5％
※ホワイトのみ綿糸縫製
190g/㎡（5.6oz）17/-天竺
Printstar ヘビーウェイトTシャツ`,
};

export default function AdminProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = (params?.id as string) || '';
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: 0,
    stock: 0,
    is_active: true,
    product_type: '',
    material: '',
    material_detail: '',
  });

  useEffect(() => {
    async function fetchProduct() {
      try {
        // 商品情報取得
        const res = await fetch(`/api/v1/products/${productId}`);
        if (!res.ok) throw new Error('商品が見つかりません');
        const data = await res.json();
        const prod = data.data || data;
        setProduct(prod);
        setFormData({
          name: prod.name || '',
          slug: prod.slug || '',
          description: prod.description || '',
          price: prod.price || 0,
          stock: prod.stock || 0,
          is_active: prod.is_active ?? true,
          product_type: prod.product_type || '',
          material: prod.material || '',
          material_detail: prod.material_detail || '',
        });

        // バリアント取得
        const varRes = await fetch(`/api/v1/products/${productId}/variants`);
        if (varRes.ok) {
          const varData = await varRes.json();
          setVariants(varData.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProduct();
  }, [productId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              type === 'number' ? Number(value) : value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '保存に失敗しました');
      }

      setSuccessMessage('保存しました');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const applyTshirtTemplate = () => {
    setFormData(prev => ({
      ...prev,
      product_type: 'tshirt',
      material: TSHIRT_MATERIAL.material,
      material_detail: TSHIRT_MATERIAL.material_detail,
    }));
  };

  const handleVariantStockChange = async (variantId: string, newStock: number) => {
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}/variants/${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      });

      if (res.ok) {
        setVariants(prev => prev.map(v =>
          v.id === variantId ? { ...v, stock: newStock } : v
        ));
      }
    } catch (err) {
      console.error('Failed to update variant:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl text-center">
          <p className="font-bold mb-4">{error}</p>
          <Link href="/admin/products" className="text-red-700 underline">
            商品一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900">商品編集</h1>
            <p className="text-gray-500 text-sm">ID: {productId}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-black text-white font-bold rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* メッセージ */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl font-bold">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl font-bold">
          {successMessage}
        </div>
      )}

      {/* 商品画像 */}
      {product?.images && product.images.length > 0 && (
        <div className="mb-8 flex gap-4 overflow-x-auto pb-4">
          {product.images.map((img, idx) => (
            <div key={idx} className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden relative flex-shrink-0">
              <Image src={img} alt={`商品画像 ${idx + 1}`} fill className="object-contain p-2" sizes="128px" />
            </div>
          ))}
        </div>
      )}

      {/* 基本情報 */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4">基本情報</h2>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">商品名</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">スラッグ</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">説明</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">価格</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">在庫</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-5 h-5 rounded"
            />
            <label className="text-sm font-bold text-gray-700">公開する</label>
          </div>
        </div>
      </div>

      {/* 商品タイプ・素材情報 */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">商品タイプ・素材</h2>
          <button
            type="button"
            onClick={applyTshirtTemplate}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-full hover:bg-blue-600 transition-colors"
          >
            Tシャツテンプレート適用
          </button>
        </div>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">商品タイプ</label>
            <select
              name="product_type"
              value={formData.product_type}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">選択してください</option>
              <option value="tshirt">Tシャツ</option>
              <option value="hoodie">パーカー</option>
              <option value="cap">キャップ</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">素材</label>
            <input
              type="text"
              name="material"
              value={formData.material}
              onChange={handleChange}
              placeholder="例: 綿100％"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">素材詳細</label>
            <textarea
              name="material_detail"
              value={formData.material_detail}
              onChange={handleChange}
              rows={5}
              placeholder="素材の詳細情報を入力"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* サイズバリエーション */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4">サイズバリエーション</h2>
        {variants.length === 0 ? (
          <p className="text-gray-500">サイズバリエーションがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">サイズ</th>
                  <th className="px-4 py-3 text-center font-bold">在庫</th>
                  <th className="px-4 py-3 text-center font-bold">身丈</th>
                  <th className="px-4 py-3 text-center font-bold">身幅</th>
                  <th className="px-4 py-3 text-center font-bold">肩幅</th>
                  <th className="px-4 py-3 text-center font-bold">袖丈</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-bold">{v.size}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        value={v.stock}
                        onChange={(e) => handleVariantStockChange(v.id, Number(e.target.value))}
                        className="w-20 px-2 py-1 border rounded text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">{v.body_length || '-'}</td>
                    <td className="px-4 py-3 text-center">{v.body_width || '-'}</td>
                    <td className="px-4 py-3 text-center">{v.shoulder_width || '-'}</td>
                    <td className="px-4 py-3 text-center">{v.sleeve_length || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {formData.product_type === 'tshirt' && (
              <p className="mt-2 text-xs text-gray-500">※単位：cm</p>
            )}
          </div>
        )}

        {/* Tシャツの場合、サイズ表を表示 */}
        {formData.product_type === 'tshirt' && variants.length === 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
            <p className="font-bold text-blue-700 mb-2">Tシャツサイズ表（参考）</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-200">
                  <th className="py-2 text-left">サイズ</th>
                  <th className="py-2 text-center">身丈</th>
                  <th className="py-2 text-center">身幅</th>
                  <th className="py-2 text-center">肩幅</th>
                  <th className="py-2 text-center">袖丈</th>
                </tr>
              </thead>
              <tbody>
                {TSHIRT_SIZES.map((s) => (
                  <tr key={s.size} className="border-b border-blue-100">
                    <td className="py-2 font-bold">{s.size}</td>
                    <td className="py-2 text-center">{s.body_length}</td>
                    <td className="py-2 text-center">{s.body_width}</td>
                    <td className="py-2 text-center">{s.shoulder_width}</td>
                    <td className="py-2 text-center">{s.sleeve_length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-blue-600">※単位：cm</p>
          </div>
        )}
      </div>
    </div>
  );
}
