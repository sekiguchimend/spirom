'use client';

import { useState } from 'react';
import type { ProductVariant } from '@/types';

interface SizeSelectorProps {
  variants: ProductVariant[];
  selectedSize: string | null;
  onSelect: (variant: ProductVariant) => void;
  material?: string;
  materialDetail?: string;
}

export function SizeSelector({ variants, selectedSize, onSelect, material, materialDetail }: SizeSelectorProps) {
  const [showSizeChart, setShowSizeChart] = useState(false);
  const hasSizeDetails = variants.some(v => v.body_length || v.body_width);

  if (variants.length === 0) {
    return null;
  }

  const selectedVariant = variants.find(v => v.size === selectedSize);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs tracking-[0.15em] text-white/70 uppercase font-bold">Size</p>
        {hasSizeDetails && (
          <button
            type="button"
            onClick={() => setShowSizeChart(!showSizeChart)}
            className="text-xs text-white/70 hover:text-white underline"
          >
            {showSizeChart ? '閉じる' : 'サイズ表を見る'}
          </button>
        )}
      </div>

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
          {selectedVariant?.stock || 0} in stock
        </p>
      )}

      {/* 選択中サイズの寸法 */}
      {selectedVariant && selectedVariant.body_length && (
        <div className="mt-3 p-3 bg-white/10 rounded-lg text-sm text-white/80">
          <p className="font-bold mb-1">{selectedVariant.size}サイズ</p>
          <p>身丈 {selectedVariant.body_length}cm / 身幅 {selectedVariant.body_width}cm / 肩幅 {selectedVariant.shoulder_width}cm / 袖丈 {selectedVariant.sleeve_length}cm</p>
        </div>
      )}

      {/* サイズ表 */}
      {showSizeChart && hasSizeDetails && (
        <div className="mt-4 bg-white/10 rounded-lg p-4 overflow-x-auto">
          <table className="w-full text-sm text-white/90">
            <thead>
              <tr className="border-b border-white/20">
                <th className="py-2 px-2 text-left font-bold">サイズ</th>
                <th className="py-2 px-2 text-center font-bold">身丈</th>
                <th className="py-2 px-2 text-center font-bold">身幅</th>
                <th className="py-2 px-2 text-center font-bold">肩幅</th>
                <th className="py-2 px-2 text-center font-bold">袖丈</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr
                  key={v.id}
                  className={`border-b border-white/10 ${selectedSize === v.size ? 'bg-white/10' : ''}`}
                >
                  <td className="py-2 px-2 font-bold">{v.size}</td>
                  <td className="py-2 px-2 text-center">{v.body_length || '-'}</td>
                  <td className="py-2 px-2 text-center">{v.body_width || '-'}</td>
                  <td className="py-2 px-2 text-center">{v.shoulder_width || '-'}</td>
                  <td className="py-2 px-2 text-center">{v.sleeve_length || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-white/60">※単位：cm</p>
        </div>
      )}

      {/* 素材情報 */}
      {(material || materialDetail) && (
        <div className="mt-4 p-3 bg-white/10 rounded-lg text-sm">
          {material && (
            <p className="text-white font-bold mb-1">素材: {material}</p>
          )}
          {materialDetail && (
            <p className="text-white/70 whitespace-pre-line text-xs">{materialDetail}</p>
          )}
        </div>
      )}
    </div>
  );
}
