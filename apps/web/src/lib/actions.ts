'use server';

import { cookies } from 'next/headers';
import { createHmac, randomUUID } from 'crypto';
import { BFF_BASE_URL } from './config';
import { getServerAccessToken } from './server-auth';
import type {
  Address,
  Order,
  CreateOrderRequest,
  CreateGuestOrderRequest,
  CreateGuestOrderResponse,
} from '@/types';

// ============================================
// セッション管理（/api/v1プロキシと同じロジック）
// ============================================

const SESSION_COOKIE_NAME = 'spirom_session_id';

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET/JWT_SECRET is not set');
  }
  return secret;
}

function signSessionId(sessionId: string): string {
  return createHmac('sha256', getSessionSecret()).update(sessionId).digest('hex');
}

function newSessionId(): string {
  return `sess_${randomUUID().replace(/-/g, '')}`;
}

async function getSessionHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  console.log('[actions] Session cookie:', sessionId ? `found (${sessionId.substring(0, 15)}...)` : 'not found');

  if (!sessionId) {
    sessionId = newSessionId();
    console.log('[actions] Generated new session:', sessionId.substring(0, 15) + '...');
  }

  return {
    'x-session-id': sessionId,
    'x-session-signature': signSessionId(sessionId),
  };
}

// ============================================
// ヘルパー関数
// ============================================

async function getAccessToken(): Promise<string | null> {
  return getServerAccessToken();
}

function withBffProxyToken(headers: Record<string, string>) {
  const proxyToken = process.env.BFF_PROXY_TOKEN || process.env.API_PROXY_TOKEN;
  if (proxyToken) {
    return { ...headers, 'X-BFF-Proxy-Token': proxyToken };
  }
  return headers;
}

async function withSessionHeaders(headers: Record<string, string>): Promise<Record<string, string>> {
  const sessionHeaders = await getSessionHeaders();
  return { ...headers, ...sessionHeaders };
}

// ============================================
// 住所関連
// ============================================

export async function fetchAddresses(): Promise<{ success: boolean; data: Address[]; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, data: [], error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/users/me/addresses`, {
      headers: {
        ...withBffProxyToken({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, data: [] };
      }
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data || [] };
  } catch {
    return { success: false, data: [], error: 'Failed to fetch addresses' };
  }
}

export async function createAddressAction(
  formData: Omit<Address, 'id'>
): Promise<{ success: boolean; data?: Address; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/users/me/addresses`, {
      method: 'POST',
      headers: {
        ...withBffProxyToken({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create address' };
  }
}

export async function updateAddressAction(
  id: string,
  formData: Omit<Address, 'id'>
): Promise<{ success: boolean; data?: Address; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/users/me/addresses/${id}`, {
      method: 'PUT',
      headers: {
        ...withBffProxyToken({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update address' };
  }
}

export async function deleteAddressAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/users/me/addresses/${id}`, {
      method: 'DELETE',
      headers: {
        ...withBffProxyToken({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete address' };
  }
}

// ============================================
// 決済関連
// ============================================

export interface CreatePaymentIntentParams {
  shipping_address_id: string;
  billing_address_id?: string;
  payment_method?: string;
  notes?: string;
}

export async function createPaymentIntentAction(
  params: CreatePaymentIntentParams
): Promise<{ success: boolean; data?: { client_secret: string; payment_intent_id: string }; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const headers = await withSessionHeaders(withBffProxyToken({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }));

    console.log('[actions] createPaymentIntent headers:', {
      sessionId: headers['x-session-id']?.substring(0, 15) + '...',
      hasSignature: !!headers['x-session-signature'],
      hasAuth: !!headers['Authorization'],
    });

    const response = await fetch(`${BFF_BASE_URL}/api/v1/payments/intent`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[actions] createPaymentIntent error:', response.status, errorText);
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create payment intent' };
  }
}

// ============================================
// 注文関連
// ============================================

export async function createOrderAction(
  request: CreateOrderRequest
): Promise<{ success: boolean; data?: Order; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/orders`, {
      method: 'POST',
      headers: {
        ...withBffProxyToken({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create order' };
  }
}

// ============================================
// ユーザー関連
// ============================================

export async function getMeAction(): Promise<{ success: boolean; data?: { id: string; email: string; name: string; phone?: string }; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/users/me`, {
      headers: {
        ...withBffProxyToken({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Token expired' };
      }
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get user' };
  }
}

// ============================================
// プロファイル作成（新規登録時にusersテーブルへ追加）
// ============================================

export async function createProfileAction(
  name: string,
  phone?: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/auth/profile`, {
      method: 'POST',
      headers: {
        ...withBffProxyToken({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
      },
      body: JSON.stringify({ name, phone }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create profile' };
  }
}

// ============================================
// ゲスト注文関連
// ============================================

export async function createGuestOrderAction(
  request: CreateGuestOrderRequest
): Promise<{ success: boolean; data?: CreateGuestOrderResponse; error?: string }> {
  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/orders/guest`, {
      method: 'POST',
      headers: {
        ...withBffProxyToken({
          'Content-Type': 'application/json',
        }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create guest order' };
  }
}

export async function createGuestPaymentIntentAction(
  orderId: string,
  guestToken: string
): Promise<{ success: boolean; data?: { client_secret: string; payment_intent_id: string }; error?: string }> {
  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/payments/guest/order-intent`, {
      method: 'POST',
      headers: {
        ...withBffProxyToken({
          'Content-Type': 'application/json',
        }),
      },
      body: JSON.stringify({ order_id: orderId, guest_token: guestToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create payment intent' };
  }
}

export async function getGuestOrderAction(
  orderId: string,
  guestToken: string
): Promise<{ success: boolean; data?: Order; error?: string }> {
  try {
    const response = await fetch(
      `${BFF_BASE_URL}/api/v1/orders/guest/${orderId}?token=${encodeURIComponent(guestToken)}`,
      {
        headers: {
          ...withBffProxyToken({
            'Content-Type': 'application/json',
          }),
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: '注文が見つかりません' };
      }
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get guest order' };
  }
}

// ============================================
// PaymentIntent IDから注文取得（支払い完了後）
// ============================================

export async function getOrderByPaymentIntentAction(
  paymentIntentId: string
): Promise<{ success: boolean; data?: Order; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(
      `${BFF_BASE_URL}/api/v1/orders/by-payment/${encodeURIComponent(paymentIntentId)}`,
      {
        headers: {
          ...withBffProxyToken({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }),
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: '注文が見つかりません' };
      }
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get order' };
  }
}

// ============================================
// JPYC決済関連
// ============================================

export interface JpycPaymentInfo {
  recipient_address: string;
  contract_address: string;
  chain_id: number;
  required_confirmations: number;
  amount_jpyc: number;
  order_id: string;
  guest_token?: string;
}

export interface PrepareJpycPaymentParams {
  shipping_address_id: string;
  billing_address_id?: string;
  notes?: string;
}

export async function prepareJpycPaymentAction(
  params: PrepareJpycPaymentParams
): Promise<{ success: boolean; data?: JpycPaymentInfo; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const headers = await withSessionHeaders(withBffProxyToken({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }));

    const response = await fetch(`${BFF_BASE_URL}/api/v1/payments/jpyc/prepare`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to prepare JPYC payment' };
  }
}

export interface VerifyJpycPaymentParams {
  order_id: string;
  tx_hash: string;
}

// 認証済みユーザー用JPYC決済検証
export async function verifyJpycPaymentAction(
  params: VerifyJpycPaymentParams
): Promise<{ success: boolean; data?: { success: boolean; order_id: string; order_number: string; confirmations: number }; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const headers = await withSessionHeaders(withBffProxyToken({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }));

    const response = await fetch(`${BFF_BASE_URL}/api/v1/payments/jpyc/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to verify JPYC payment' };
  }
}

// ゲスト用JPYC決済準備パラメータ
export interface PrepareJpycPaymentGuestParams {
  shipping_address: {
    name: string;
    country: string;
    postal_code: string;
    prefecture: string;
    city: string;
    address_line1: string;
    address_line2?: string;
    phone: string;
  };
  billing_address?: {
    name: string;
    country: string;
    postal_code: string;
    prefecture: string;
    city: string;
    address_line1: string;
    address_line2?: string;
    phone: string;
  };
  email?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    variant_id?: string;
    size?: string;
  }>;
}

// ゲスト用JPYC決済準備
export async function prepareJpycPaymentGuestAction(
  params: PrepareJpycPaymentGuestParams
): Promise<{ success: boolean; data?: JpycPaymentInfo; error?: string }> {
  try {
    const headers = await withSessionHeaders(withBffProxyToken({
      'Content-Type': 'application/json',
    }));

    const response = await fetch(`${BFF_BASE_URL}/api/v1/payments/jpyc/guest/prepare`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to prepare JPYC payment' };
  }
}

// ゲスト用JPYC決済検証パラメータ
export interface VerifyJpycPaymentGuestParams {
  order_id: string;
  tx_hash: string;
  guest_token: string;
}

// ゲスト用JPYC決済検証
export async function verifyJpycPaymentGuestAction(
  params: VerifyJpycPaymentGuestParams
): Promise<{ success: boolean; data?: { success: boolean; order_id: string; order_number: string; confirmations: number }; error?: string }> {
  try {
    const headers = await withSessionHeaders(withBffProxyToken({
      'Content-Type': 'application/json',
    }));

    const response = await fetch(`${BFF_BASE_URL}/api/v1/payments/jpyc/guest/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to verify JPYC payment' };
  }
}

export async function getJpycPaymentInfoAction(): Promise<{ success: boolean; data?: { recipient_address: string; contract_address: string; chain_id: number; required_confirmations: number }; error?: string }> {
  try {
    const headers = await withSessionHeaders(withBffProxyToken({
      'Content-Type': 'application/json',
    }));

    const response = await fetch(`${BFF_BASE_URL}/api/v1/payments/jpyc/info`, {
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get JPYC payment info' };
  }
}
