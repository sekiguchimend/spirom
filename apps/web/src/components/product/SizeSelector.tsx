'use client';

import type { ProductVariant } from '@/types';

interface SizeSelectorProps {
  variants: ProductVariant[];
  selectedSize: string | null;
  onSelect: (variant: ProductVariant) => void;
}

export function SizeSelector({ variants, selectedSize, onSelect }: SizeSelectorProps) {
  if (variants.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <p className="text-xs tracking-[0.15em] text-white/70 uppercase mb-3 font-bold">Size</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const isSelected = selectedSize === variant.size;
          const isOutOfStock = variant.stock <= 0;

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => !isOutOfStock && onSelect(variant)}
              disabled={isOutOfStock}
              className={`
                min-w-[48px] h-12 px-4 font-bold text-sm rounded-full transition-all duration-200
                ${isSelected
                  ? 'bg-white text-[#4a7c59] ring-2 ring-white'
                  : isOutOfStock
                    ? 'bg-white/5 text-white/30 cursor-not-allowed line-through'
                    : 'bg-white/15 text-white hover:bg-white/25 border border-white/30'
                }
              `}
            >
              {variant.size}
            </button>
          );
        })}
      </div>
      {selectedSize && (
        <p className="mt-2 text-sm text-white/70 font-medium">
          {variants.find(v => v.size === selectedSize)?.stock || 0} in stock
        </p>
      )}
    </div>
  );
}
