'use client';

import { CART_STORAGE_KEY } from './config';
import type { CartItem } from '@/types';

// Re-export for backwards compatibility
export type { CartItem };

type ApiCartItem = {
  product_id: string;
  product_name: string;
  product_slug: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string | null;
};

type ApiCartResponse = {
  data: {
    session_id: string;
    items: ApiCartItem[];
    subtotal: number;
    item_count: number;
  };
};

function toCartItems(apiItems: ApiCartItem[], sessionId: string): CartItem[] {
  return apiItems.map((it) => ({
    id: `cart:${sessionId}:${it.product_id}`,
    productId: it.product_id,
    slug: it.product_slug,
    name: it.product_name,
    price: it.price,
    quantity: it.quantity,
    image: it.image_url || '/placeholder-product.jpg',
  }));
}

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

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `API error: ${res.status}`);
  }
  return res.json();
}

// APIからカートを再同期（ページ初期化用）
export async function refreshCart(): Promise<CartItem[]> {
  const result = await fetchApi<ApiCartResponse>('/cart', { method: 'GET' });
  const items = toCartItems(result.data.items || [], result.data.session_id);
  saveCart(items);
  return items;
}

// カートに商品を追加（APIを正とする）
export async function addToCart(item: Omit<CartItem, 'id'>): Promise<void> {
  const result = await fetchApi<ApiCartResponse>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: item.productId, quantity: item.quantity }),
  });
  const items = toCartItems(result.data.items || [], result.data.session_id);
  saveCart(items);
}

// カートから商品を削除
export async function removeFromCart(productId: string): Promise<void> {
  const result = await fetchApi<ApiCartResponse>(`/cart/items/${productId}`, { method: 'DELETE' });
  const items = toCartItems(result.data.items || [], result.data.session_id);
  saveCart(items);
}

// カートの商品数量を更新
export async function updateCartQuantity(productId: string, quantity: number): Promise<void> {
  if (quantity <= 0) {
    await removeFromCart(productId);
    return;
  }
  const result = await fetchApi<ApiCartResponse>(`/cart/items/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
  const items = toCartItems(result.data.items || [], result.data.session_id);
  saveCart(items);
}

// カートをクリア
export async function clearCart(): Promise<void> {
  await fetchApi<{ message: string }>('/cart', { method: 'DELETE' });
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
