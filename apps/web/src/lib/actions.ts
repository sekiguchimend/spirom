'use server';

import { cookies } from 'next/headers';
import {
  BFF_BASE_URL,
  COOKIE_NAMES,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
  MAX_SESSION_SECONDS,
} from './config';
import type {
  User,
  Address,
  Order,
  OrderItem,
  CreateOrderItemRequest,
  CreateOrderRequest,
  TokenResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from '@/types';

// Re-export types for backwards compatibility
export type {
  User,
  Address,
  Order,
  OrderItem,
  CreateOrderItemRequest,
  CreateOrderRequest,
  TokenResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
};

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value || null;
}

async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAMES.ACCESS_TOKEN);
  cookieStore.delete(COOKIE_NAMES.REFRESH_TOKEN);
  cookieStore.delete(COOKIE_NAMES.SESSION_STARTED_AT);
}

async function setAuthCookies(tokens: TokenResponse) {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === 'production';

  // access
  cookieStore.set(COOKIE_NAMES.ACCESS_TOKEN, tokens.access_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: tokens.expires_in,
    path: '/',
  });

  // refresh（ローテーション前提で常に更新）
  cookieStore.set(COOKIE_NAMES.REFRESH_TOKEN, tokens.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
}

async function ensureSessionStartCookie() {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === 'production';

  const existing = cookieStore.get(COOKIE_NAMES.SESSION_STARTED_AT)?.value;
  if (existing) return;

  cookieStore.set(COOKIE_NAMES.SESSION_STARTED_AT, String(Math.floor(Date.now() / 1000)), {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: MAX_SESSION_SECONDS,
    path: '/',
  });
}

// ============================================
// 住所関連
// ============================================

export async function fetchAddresses(): Promise<{ success: boolean; data: Address[]; error?: string }> {
  const token = await getToken();
  if (!token) {
    return { success: false, data: [], error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/users/me/addresses`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
  } catch (error) {
    console.error('Failed to fetch addresses:', error);
    return { success: false, data: [], error: 'Failed to fetch addresses' };
  }
}

export async function createAddressAction(
  formData: Omit<Address, 'id'>
): Promise<{ success: boolean; data?: Address; error?: string }> {
  const token = await getToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/users/me/addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
    console.error('Failed to create address:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create address' };
  }
}

// ============================================
// 決済関連
// ============================================

export async function createPaymentIntentAction(
  items: CreateOrderItemRequest[],
  shippingAddressId: string,
  notes?: string
): Promise<{ success: boolean; data?: { client_secret: string; payment_intent_id: string }; error?: string }> {
  const token = await getToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/payments/intent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items, shipping_address_id: shippingAddressId, notes }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Failed to create payment intent:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create payment intent' };
  }
}

// ============================================
// 注文関連
// ============================================

export async function createOrderAction(
  request: CreateOrderRequest
): Promise<{ success: boolean; data?: Order; error?: string }> {
  const token = await getToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
    console.error('Failed to create order:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create order' };
  }
}

// ============================================
// 認証関連
// ============================================

export async function refreshSessionAction(): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;
  const startedAtStr = cookieStore.get(COOKIE_NAMES.SESSION_STARTED_AT)?.value;

  if (!refreshToken || !startedAtStr) {
    await clearAuthCookies();
    return { success: false, error: 'Session expired' };
  }

  // 念のため（Cookie maxAgeでも切れるが、防御的に上限を保証）
  const startedAt = Number(startedAtStr);
  if (!Number.isFinite(startedAt)) {
    await clearAuthCookies();
    return { success: false, error: 'Session expired' };
  }
  const now = Math.floor(Date.now() / 1000);
  if (now - startedAt > MAX_SESSION_SECONDS) {
    await clearAuthCookies();
    return { success: false, error: 'Session expired' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });

    if (!response.ok) {
      await clearAuthCookies();
      return { success: false, error: 'Session expired' };
    }

    const tokens: TokenResponse = await response.json();
    await setAuthCookies(tokens);
    // started_at は最初のログイン時刻を維持（更新しない）
    return { success: true };
  } catch (error) {
    console.error('Refresh session failed:', error);
    await clearAuthCookies();
    return { success: false, error: 'Session expired' };
  }
}

export async function loginAction(
  request: LoginRequest
): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Login failed: ${response.status}`);
    }

    const result: AuthResponse = await response.json();

    await setAuthCookies(result.tokens);
    await ensureSessionStartCookie();

    return { success: true, data: result };
  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
  }
}

export async function registerAction(
  request: RegisterRequest
): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Registration failed: ${response.status}`);
    }

    const result: AuthResponse = await response.json();

    await setAuthCookies(result.tokens);
    await ensureSessionStartCookie();

    return { success: true, data: result };
  } catch (error) {
    console.error('Registration failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Registration failed' };
  }
}

export async function logoutAction(): Promise<{ success: boolean; error?: string }> {
  const token = await getToken();

  try {
    if (token) {
      await fetch(`${BFF_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error('Logout API call failed:', error);
    // Continue to clear cookie even if API fails
  }

  await clearAuthCookies();

  return { success: true };
}

export async function getMeAction(): Promise<{ success: boolean; data?: User; error?: string }> {
  const token = await getToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token is invalid, clear cookie
        await clearAuthCookies();
        return { success: false, error: 'Token expired' };
      }
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Failed to get user:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get user' };
  }
}
