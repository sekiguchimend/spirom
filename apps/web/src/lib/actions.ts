'use server';

import { cookies } from 'next/headers';

const BFF_URL = process.env.BFF_URL || 'http://localhost:8787';

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('spirom_auth_token')?.value || null;
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

export async function fetchAddresses(): Promise<{ success: boolean; data: Address[]; error?: string }> {
  const token = await getToken();
  if (!token) {
    return { success: false, data: [], error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_URL}/api/v1/users/me/addresses`, {
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
    const response = await fetch(`${BFF_URL}/api/v1/users/me/addresses`, {
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

export interface CreateOrderItemRequest {
  product_id: string;
  quantity: number;
  price: number;
}

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
    const response = await fetch(`${BFF_URL}/api/v1/payments/intent`, {
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

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
  shipping_address_id: string;
  billing_address_id?: string;
  payment_method: 'credit_card' | 'paypay' | 'rakuten_pay' | 'konbini' | 'bank_transfer';
}

export async function createOrderAction(
  request: CreateOrderRequest
): Promise<{ success: boolean; data?: Order; error?: string }> {
  const token = await getToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_URL}/api/v1/orders`, {
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

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  is_verified: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: TokenResponse;
}

export async function loginAction(
  request: LoginRequest
): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
  try {
    const response = await fetch(`${BFF_URL}/api/v1/auth/login`, {
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

    // Set auth cookie
    const cookieStore = await cookies();
    cookieStore.set('spirom_auth_token', result.tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.tokens.expires_in,
      path: '/',
    });

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
    const response = await fetch(`${BFF_URL}/api/v1/auth/register`, {
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

    // Set auth cookie
    const cookieStore = await cookies();
    cookieStore.set('spirom_auth_token', result.tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.tokens.expires_in,
      path: '/',
    });

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
      await fetch(`${BFF_URL}/api/v1/auth/logout`, {
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

  // Clear auth cookie
  const cookieStore = await cookies();
  cookieStore.delete('spirom_auth_token');

  return { success: true };
}

export async function getMeAction(): Promise<{ success: boolean; data?: User; error?: string }> {
  const token = await getToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${BFF_URL}/api/v1/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token is invalid, clear cookie
        const cookieStore = await cookies();
        cookieStore.delete('spirom_auth_token');
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
