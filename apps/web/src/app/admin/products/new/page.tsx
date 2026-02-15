'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MediaUploader from '@/components/admin/MediaUploader';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE'];

interface VariantInput {
  size: string;
  stock: number;
  price_adjustment: number;
}

export default function NewProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    compare_at_price: '',
    category_id: '',
    sku: '',
    is_active: true,
    is_featured: false,
    tags: '',
  });

  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const [variants, setVariants] = useState<VariantInput[]>([
    { size: 'S', stock: 10, price_adjustment: 0 },
    { size: 'M', stock: 10, price_adjustment: 0 },
    { size: 'L', stock: 10, price_adjustment: 0 },
    { size: 'XL', stock: 10, price_adjustment: 0 },
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleMediaUpload = (urls: string[]) => {
    setMediaUrls(urls);
  };

  const handleVariantChange = (index: number, field: keyof VariantInput, value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const addVariant = () => {
    const usedSizes = variants.map(v => v.size);
    const availableSize = SIZES.find(s => !usedSizes.includes(s)) || 'FREE';
    setVariants([...variants, { size: availableSize, stock: 10, price_adjustment: 0 }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 商品を作成
      const productRes = await fetch('/api/v1/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          price: parseInt(formData.price) || 0,
          compare_at_price: formData.compare_at_price ? parseInt(formData.compare_at_price) : null,
          category_id: formData.category_id || null,
          images: mediaUrls,
          sku: formData.sku,
          stock: variants.reduce((sum, v) => sum + v.stock, 0),
          is_active: formData.is_active,
          is_featured: formData.is_featured,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      if (!productRes.ok) {
        throw new Error('商品の作成に失敗しました');
      }

      const productData = await productRes.json();
      const productId = productData.data?.id;

      // バリアントを作成
      if (productId && variants.length > 0) {
        await fetch(`/api/v1/admin/products/${productId}/variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variants }),
        });
      }

      router.push('/admin/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <Link href="/admin/products" className="text-gray-500 hover:text-gray-700 text-sm font-medium mb-2 inline-block">
          ← 商品一覧に戻る
        </Link>
        <h1 className="text-3xl font-black text-gray-900">新規商品追加</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 基本情報 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-6">基本情報</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">商品名 *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={generateSlug}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 bg-white"
                placeholder="例: クラシックTシャツ"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">スラッグ *</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 bg-white"
                placeholder="例: classic-tshirt"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 bg-white"
                placeholder="例: TSH-001"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">説明</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 bg-white"
                placeholder="商品の説明を入力..."
              />
            </div>
          </div>
        </div>

        {/* 価格 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-6">価格設定</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">販売価格 (円) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 bg-white"
                placeholder="例: 3980"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">比較価格 (円)</label>
              <input
                type="number"
                name="compare_at_price"
                value={formData.compare_at_price}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 bg-white"
                placeholder="例: 4980 (セール前価格)"
              />
            </div>
          </div>
        </div>

        {/* サイズバリエーション */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900">サイズバリエーション</h2>
            <button
              type="button"
              onClick={addVariant}
              className="text-sm font-bold text-black hover:underline"
            >
              + サイズを追加
            </button>
          </div>

          <div className="space-y-4">
            {variants.map((variant, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">サイズ</label>
                  <select
                    value={variant.size}
                    onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    {SIZES.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">在庫数</label>
                  <input
                    type="number"
                    value={variant.stock}
                    onChange={(e) => handleVariantChange(index, 'stock', parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">価格調整 (円)</label>
                  <input
                    type="number"
                    value={variant.price_adjustment}
                    onChange={(e) => handleVariantChange(index, 'price_adjustment', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    placeholder="例: 500"
                  />
                </div>
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* メディア（画像・動画） */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-black text-gray-900">メディア</h2>
            <p className="text-sm text-gray-500 mt-1">商品の画像・動画をアップロードできます</p>
          </div>

          <MediaUploader
            onUploadComplete={handleMediaUpload}
            existingUrls={mediaUrls}
            maxFiles={10}
          />
        </div>

        {/* オプション */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-black text-gray-900 mb-6">オプション</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">タグ (カンマ区切り)</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 bg-white"
                placeholder="例: new, sale, popular"
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span className="font-medium">公開する</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span className="font-medium">おすすめ商品</span>
              </label>
            </div>
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-black text-white font-bold rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '保存中...' : '商品を追加'}
          </button>
          <Link
            href="/admin/products"
            className="px-8 py-3 bg-gray-100 text-gray-700 font-bold rounded-full hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
