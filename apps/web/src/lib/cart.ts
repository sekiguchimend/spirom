'use client';

import { CART_STORAGE_KEY } from './config';
import { supabaseAuth } from '@/lib/supabase-auth';
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
  variant_id?: string | null;
  size?: string | null;
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
    id: `cart:${sessionId}:${it.product_id}:${it.variant_id || 'default'}`,
    productId: it.product_id,
    slug: it.product_slug,
    name: it.product_name,
    price: it.price,
    quantity: it.quantity,
    image: it.image_url || '/placeholder-product.jpg',
    variantId: it.variant_id || undefined,
    size: it.size || undefined,
  }));
}

// 認証状態を確認（非同期）
async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabaseAuth.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}

// カートを取得（ローカルストレージから）
export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// カートを保存（ローカルストレージに）
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

// APIからカートを再同期（認証済みユーザーのみ）
export async function refreshCart(): Promise<CartItem[]> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    // ゲスト: ローカルストレージから取得
    return getCart();
  }

  // 認証済み: API経由で取得
  const result = await fetchApi<ApiCartResponse>('/cart', { method: 'GET' });
  const items = toCartItems(result.data.items || [], result.data.session_id);
  saveCart(items);
  return items;
}

// カートに商品を追加
export async function addToCart(item: Omit<CartItem, 'id'>): Promise<void> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    // ゲスト: ローカルストレージのみ
    const cart = getCart();
    // 同じ商品+同じサイズの組み合わせを探す
    const existingIndex = cart.findIndex(
      (c) => c.productId === item.productId && c.variantId === item.variantId
    );

    if (existingIndex >= 0) {
      // 既存アイテムの数量を更新
      cart[existingIndex].quantity += item.quantity;
    } else {
      // 新規アイテムを追加
      cart.push({
        id: `cart:local:${item.productId}:${item.variantId || 'default'}`,
        productId: item.productId,
        slug: item.slug,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        variantId: item.variantId,
        size: item.size,
      });
    }

    saveCart(cart);
    return;
  }

  // 認証済み: API経由
  const result = await fetchApi<ApiCartResponse>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({
      product_id: item.productId,
      quantity: item.quantity,
      variant_id: item.variantId,
      size: item.size,
    }),
  });
  const items = toCartItems(result.data.items || [], result.data.session_id);
  saveCart(items);
}

// カートから商品を削除
export async function removeFromCart(productId: string, variantId?: string): Promise<void> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    // ゲスト: ローカルストレージのみ
    const cart = getCart().filter(
      (c) => !(c.productId === productId && c.variantId === variantId)
    );
    saveCart(cart);
    return;
  }

  // 認証済み: API経由
  const url = variantId
    ? `/cart/items/${productId}?variant_id=${variantId}`
    : `/cart/items/${productId}`;
  const result = await fetchApi<ApiCartResponse>(url, { method: 'DELETE' });
  const items = toCartItems(result.data.items || [], result.data.session_id);
  saveCart(items);
}

// カートの商品数量を更新
export async function updateCartQuantity(productId: string, quantity: number, variantId?: string): Promise<void> {
  if (quantity <= 0) {
    await removeFromCart(productId, variantId);
    return;
  }

  const authenticated = await isAuthenticated();

  if (!authenticated) {
    // ゲスト: ローカルストレージのみ
    const cart = getCart();
    const item = cart.find((c) => c.productId === productId && c.variantId === variantId);
    if (item) {
      item.quantity = quantity;
      saveCart(cart);
    }
    return;
  }

  // 認証済み: API経由
  const url = variantId
    ? `/cart/items/${productId}?variant_id=${variantId}`
    : `/cart/items/${productId}`;
  const result = await fetchApi<ApiCartResponse>(url, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
  const items = toCartItems(result.data.items || [], result.data.session_id);
  saveCart(items);
}

// カートをクリア
export async function clearCart(): Promise<void> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    // ゲスト: ローカルストレージのみ
    saveCart([]);
    return;
  }

  // 認証済み: API経由
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

// ログイン時にローカルカートをサーバーに統合
export async function mergeLocalCartToServer(): Promise<void> {
  const localCart = getCart();
  if (localCart.length === 0) return;

  const authenticated = await isAuthenticated();
  if (!authenticated) return;

  // ローカルカートの各アイテムをサーバーに追加
  for (const item of localCart) {
    try {
      await fetchApi<ApiCartResponse>('/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          product_id: item.productId,
          quantity: item.quantity,
          variant_id: item.variantId,
          size: item.size,
        }),
      });
    } catch (error) {
      console.error('Failed to merge cart item:', error);
    }
  }

  // サーバーから最新のカートを取得して同期
  await refreshCart();
}
