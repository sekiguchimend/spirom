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
  CreateOrderItemRequest,
  CreateOrderRequest,
  TokenResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from '@/types';

// Note: Types should be imported from @/types directly

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value || null;
}

function withBffProxyToken(headers: Record<string, string>) {
  const proxyToken = process.env.BFF_PROXY_TOKEN || process.env.API_PROXY_TOKEN;
  if (proxyToken) {
    return { ...headers, 'X-BFF-Proxy-Token': proxyToken };
  }
  return headers;
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

  cookieStore.set(COOKIE_NAMES.ACCESS_TOKEN, tokens.access_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: tokens.expires_in,
    path: '/',
  });

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
  const token = await getToken();
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

// ============================================
// 決済関連
// ============================================

export async function createPaymentIntentAction(
  orderId: string
): Promise<{ success: boolean; data?: { client_secret: string; payment_intent_id: string }; error?: string }> {
  const token = await getToken();
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
  const token = await getToken();
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
      headers: withBffProxyToken({ 'Content-Type': 'application/json' }),
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
  } catch {
    await clearAuthCookies();
    return { success: false, error: 'Session expired' };
  }
}

export async function loginAction(
  request: LoginRequest
): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
  const targetUrl = `${BFF_BASE_URL}/api/v1/auth/login`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: withBffProxyToken({
        'Content-Type': 'application/json',
        'Connection': 'close',
      }),
      body: JSON.stringify(request),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || errorData.message || `Login failed: ${response.status}`);
    }

    const result: AuthResponse = await response.json();

    await setAuthCookies(result.tokens);
    await ensureSessionStartCookie();

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
  }
}

export async function registerAction(
  request: RegisterRequest
): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
  const targetUrl = `${BFF_BASE_URL}/api/v1/auth/register`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: withBffProxyToken({
        'Content-Type': 'application/json',
        'Connection': 'close',
      }),
      body: JSON.stringify(request),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || errorData.message || `Registration failed: ${response.status}`);
    }

    const result: AuthResponse = await response.json();

    await setAuthCookies(result.tokens);
    await ensureSessionStartCookie();

    return { success: true, data: result };
  } catch (error) {
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
          ...withBffProxyToken({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }),
        },
      });
    }
  } catch {
    // Continue to clear cookies even if API fails
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
        ...withBffProxyToken({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
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
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get user' };
  }
}
