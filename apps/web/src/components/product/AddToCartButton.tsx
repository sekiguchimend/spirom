'use client';

import { useState } from 'react';
import { addToCart } from '@/lib/cart';
import { CART_ANIMATION_DELAY_MS, SUCCESS_MESSAGE_DURATION_MS } from '@/lib/config';
import { SizeSelector } from './SizeSelector';
import { useTranslation } from '@/lib/i18n/useTranslation';
import dynamic from 'next/dynamic';
import type { ProductVariant } from '@/types';

const ProductCheckout = dynamic(() => import('./ProductCheckout'), {
  ssr: false,
});

interface AddToCartButtonProps {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  variants?: ProductVariant[];
  material?: string | null;
  materialDetail?: string | null;
}

export function AddToCartButton({
  productId,
  slug,
  name,
  price,
  image,
  stock,
  variants = [],
  material,
  materialDetail,
}: AddToCartButtonProps) {
  const { t } = useTranslation('products');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  // デフォルトで最初の在庫ありサイズを選択、なければ最初のサイズ
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(() => {
    if (variants.length === 0) return null;
    const available = variants.find(v => v.stock > 0);
    return available || variants[0];
  });
  const [sizeError, setSizeError] = useState(false);

  const hasVariants = variants.length > 0;
  const currentStock = hasVariants
    ? (selectedVariant?.stock || 0)
    : stock;
  const currentPrice = hasVariants
    ? price + (selectedVariant?.price_adjustment || 0)
    : price;
  const inStock = currentStock > 0;
  const canPurchase = hasVariants ? (selectedVariant !== null && inStock) : inStock;

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrease = () => {
    if (quantity < currentStock) setQuantity(quantity + 1);
  };

  const handleSizeSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setSizeError(false);
    // 数量が在庫を超えていたらリセット
    if (quantity > variant.stock) {
      setQuantity(Math.max(1, variant.stock));
    }
  };

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) {
      setSizeError(true);
      return;
    }
    if (!canPurchase) return;

    setIsAdding(true);
    void (async () => {
      try {
        await addToCart({
          productId,
          slug,
          name,
          price: currentPrice,
          quantity,
          image,
          variantId: selectedVariant?.id,
          size: selectedVariant?.size,
        });

        setTimeout(() => {
          setIsAdding(false);
          setIsAdded(true);
          setTimeout(() => setIsAdded(false), SUCCESS_MESSAGE_DURATION_MS);
        }, CART_ANIMATION_DELAY_MS);
      } catch {
        setIsAdding(false);
      }
    })();
  };

  const handleBuyNow = () => {
    if (hasVariants && !selectedVariant) {
      setSizeError(true);
      return;
    }
    if (!canPurchase) return;
    setShowCheckout(true);
  };

  return (
    <>
      {/* サイズ選択 */}
      {hasVariants && (
        <>
          <SizeSelector
            variants={variants}
            selectedSize={selectedVariant?.size || null}
            onSelect={handleSizeSelect}
            material={material || undefined}
            materialDetail={materialDetail || undefined}
          />
          {sizeError && (
            <p className="text-red-300 text-sm font-bold mb-4">{t('detail.selectSizeError')}</p>
          )}
        </>
      )}

      {/* 数量 */}
      <div className="mb-6">
        <p className="text-xs tracking-[0.15em] text-white/70 uppercase mb-3 font-bold">{t('detail.quantity')}</p>
        <div className="inline-flex items-center bg-white/15 rounded-full">
          <button
            type="button"
            onClick={handleDecrease}
            disabled={quantity <= 1}
            className="w-12 h-12 text-xl font-bold text-white hover:bg-white/25 rounded-full transition-colors disabled:opacity-50"
          >
            −
          </button>
          <span className="w-12 text-center font-bold text-lg text-white">{quantity}</span>
          <button
            type="button"
            onClick={handleIncrease}
            disabled={quantity >= currentStock || !canPurchase}
            className="w-12 h-12 text-xl font-bold text-white hover:bg-white/25 rounded-full transition-colors disabled:opacity-50"
          >
            +
          </button>
        </div>
        {!hasVariants && (
          <span className="ml-4 text-sm text-white/70 font-bold">
            {inStock ? `${stock} ${t('detail.inStock')}` : t('detail.outOfStock')}
          </span>
        )}
      </div>

      {/* ボタン */}
      <div className="flex gap-3 mb-10">
        <button
          type="button"
          onClick={handleAddToCart}
          className="flex-1 py-3 bg-white/15 text-white font-bold text-sm tracking-wider rounded-full hover:bg-white/25 transition-all duration-300 disabled:bg-white/10 disabled:text-white/50 border border-white/30"
          disabled={!canPurchase || isAdding}
        >
          {isAdding ? t('detail.adding') : isAdded ? t('detail.added') : t('detail.addToCart')}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="flex-1 py-3 bg-white text-[#4a7c59] font-bold text-sm tracking-wider rounded-full hover:bg-white/90 transition-all duration-300 disabled:bg-white/30 disabled:text-white/50 flex items-center justify-center gap-2"
          disabled={!canPurchase}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          {t('detail.buyNow')}
        </button>
      </div>

      {/* チェックアウトモーダル */}
      {showCheckout && (
        <ProductCheckout
          product={{
            id: productId,
            name,
            price: currentPrice,
            image,
          }}
          quantity={quantity}
          size={selectedVariant?.size}
          variantId={selectedVariant?.id}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}
