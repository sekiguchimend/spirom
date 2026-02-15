'use server';

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

export async function createPaymentIntentAction(
  orderId: string
): Promise<{ success: boolean; data?: { client_secret: string; payment_intent_id: string }; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/payments/intent`, {
      method: 'POST',
      headers: {
        ...withBffProxyToken({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
      },
      body: JSON.stringify({ order_id: orderId }),
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
    const response = await fetch(`${BFF_BASE_URL}/api/v1/payments/guest/intent`, {
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
