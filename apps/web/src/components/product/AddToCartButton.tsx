'use client';

import { useState } from 'react';
import { addToCart } from '@/lib/cart';
import dynamic from 'next/dynamic';

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
}

export default function AddToCartButton({
  productId,
  slug,
  name,
  price,
  image,
  stock,
}: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const inStock = stock > 0;

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrease = () => {
    if (quantity < stock) setQuantity(quantity + 1);
  };

  const handleAddToCart = () => {
    if (!inStock) return;

    setIsAdding(true);
    addToCart({
      productId,
      slug,
      name,
      price,
      quantity,
      image,
    });

    setTimeout(() => {
      setIsAdding(false);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }, 300);
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    setShowCheckout(true);
  };

  return (
    <>
      {/* 数量 */}
      <div className="mb-6">
        <p className="text-xs tracking-[0.15em] text-white/70 uppercase mb-3 font-bold">Quantity</p>
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
            disabled={quantity >= stock}
            className="w-12 h-12 text-xl font-bold text-white hover:bg-white/25 rounded-full transition-colors disabled:opacity-50"
          >
            +
          </button>
        </div>
        <span className="ml-4 text-sm text-white/70 font-bold">
          {inStock ? `${stock} in stock` : 'Out of stock'}
        </span>
      </div>

      {/* ボタン */}
      <div className="flex gap-4 mb-10">
        <button
          type="button"
          onClick={handleAddToCart}
          className="flex-1 py-5 bg-white text-[#4a7c59] font-bold text-sm tracking-wider rounded-full hover:bg-white/90 transition-all duration-300 disabled:bg-white/30 disabled:text-white/50"
          disabled={!inStock || isAdding}
        >
          {isAdding ? '追加中...' : isAdded ? '追加しました!' : 'ADD TO BAG'}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25 transition-colors group"
          disabled={!inStock}
          title="今すぐ購入"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            className="group-hover:scale-110 transition-transform"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* チェックアウトモーダル */}
      {showCheckout && (
        <ProductCheckout
          product={{
            id: productId,
            name,
            price,
            image,
          }}
          quantity={quantity}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}
