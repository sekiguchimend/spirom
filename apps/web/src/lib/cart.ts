'use client';

import { CART_STORAGE_KEY } from './config';
import type { CartItem } from '@/types';

// Re-export for backwards compatibility
export type { CartItem };

// カートを取得
export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// カートを保存
function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  // カート更新イベントを発火
  window.dispatchEvent(new CustomEvent('cart-updated'));
}

// カートに商品を追加
export function addToCart(item: Omit<CartItem, 'id'>): void {
  const cart = getCart();
  const existingIndex = cart.findIndex(
    (i) => i.productId === item.productId
  );

  if (existingIndex >= 0) {
    // 既存の商品は数量を追加
    cart[existingIndex].quantity += item.quantity;
  } else {
    // 新規追加
    cart.push({
      ...item,
      id: `cart-${Date.now()}`,
    });
  }

  saveCart(cart);
}

// カートから商品を削除
export function removeFromCart(productId: string): void {
  const cart = getCart();
  const filtered = cart.filter((item) => item.productId !== productId);
  saveCart(filtered);
}

// カートの商品数量を更新
export function updateCartQuantity(productId: string, quantity: number): void {
  const cart = getCart();
  const index = cart.findIndex((item) => item.productId === productId);

  if (index >= 0) {
    if (quantity <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = quantity;
    }
    saveCart(cart);
  }
}

// カートをクリア
export function clearCart(): void {
  saveCart([]);
}

// カート内の商品数を取得
export function getCartCount(): number {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

// カート合計金額を取得
export function getCartTotal(): number {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
