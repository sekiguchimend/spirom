import { cookies } from 'next/headers';

// Server ComponentからBFFを直接叩く（Route Handlerを経由しない）
const BFF_URL = process.env.BFF_URL || 'http://localhost:8787';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  requireAuth?: boolean;
}

async function serverFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = `${BFF_URL}${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Server Componentからcookieを読み取ってトークンを取得
  if (options.requireAuth !== false) {
    const cookieStore = await cookies();
    const token = cookieStore.get('spirom_auth_token')?.value;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
    // Server Componentでのキャッシュ制御
    cache: 'no-store', // 認証データは常に最新を取得
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

// ============================================
// 認証関連
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  is_verified: boolean;
  created_at: string;
}

export async function getServerUser(): Promise<User | null> {
  try {
    const response = await serverFetch<{ data: User }>('/api/v1/users/me');
    return response.data;
  } catch {
    return null;
  }
}

// ============================================
// 住所関連
// ============================================

export interface Address {
  id: string;
  name?: string;
  postal_code: string;
  prefecture: string;
  city: string;
  address_line1: string;
  address_line2?: string;
  phone?: string;
  is_default: boolean;
}

export async function getServerAddresses(): Promise<Address[]> {
  try {
    const response = await serverFetch<{ data: Address[] }>('/api/v1/users/me/addresses');
    return response.data;
  } catch {
    return [];
  }
}

// ============================================
// 注文関連
// ============================================

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
  shipped_at?: string;
  delivered_at?: string;
  items?: OrderItem[];
  item_count?: number;
}

export async function getServerOrders(): Promise<Order[]> {
  try {
    const response = await serverFetch<{ data: Order[] }>('/api/v1/orders');
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
}

export async function getServerOrder(orderId: string): Promise<Order | null> {
  try {
    const response = await serverFetch<{ data: Order }>(`/api/v1/orders/${orderId}`);
    return response.data;
  } catch {
    return null;
  }
}

// ============================================
// 認証チェック
// ============================================

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('spirom_auth_token')?.value;
  return !!token;
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('spirom_auth_token')?.value || null;
}
