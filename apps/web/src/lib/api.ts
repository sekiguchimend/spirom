// API Base URL（認証が必要なエンドポイント用）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
}

async function fetchApi<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API request failed' }));
    throw new Error(error.message || `API request failed: ${response.status}`);
  }

  return response.json();
}

// ============================================
// 注文関連
// ============================================

export interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  shipping_address_id: string;
  billing_address_id?: string;
  payment_method: 'credit_card' | 'paypay' | 'rakuten_pay' | 'konbini' | 'bank_transfer';
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
}

export interface CreateOrderResponse {
  data: Order;
}

export async function createOrder(
  request: CreateOrderRequest,
  token: string
): Promise<CreateOrderResponse> {
  return fetchApi<CreateOrderResponse>('/api/v1/orders', {
    method: 'POST',
    body: request,
    token,
  });
}

export async function getOrder(orderId: string, token: string): Promise<{ data: Order }> {
  return fetchApi<{ data: Order }>(`/api/v1/orders/${orderId}`, { token });
}

export async function getOrders(token: string): Promise<{ data: Order[] }> {
  return fetchApi<{ data: Order[] }>('/api/v1/orders', { token });
}

// ============================================
// 決済関連
// ============================================

export interface CreatePaymentIntentRequest {
  items: OrderItem[];
  shipping_address_id: string;
  notes?: string;
}

export interface CreatePaymentIntentResponse {
  data: {
    client_secret: string;
    payment_intent_id: string;
  };
}

export async function createPaymentIntent(
  request: CreatePaymentIntentRequest,
  token: string
): Promise<CreatePaymentIntentResponse> {
  return fetchApi<CreatePaymentIntentResponse>('/api/v1/payments/intent', {
    method: 'POST',
    body: request,
    token,
  });
}

export interface ConfirmPaymentRequest {
  payment_intent_id: string;
}

export async function confirmPayment(
  paymentIntentId: string,
  token: string
): Promise<{ data: null }> {
  return fetchApi<{ data: null }>('/api/v1/payments/confirm', {
    method: 'POST',
    body: { payment_intent_id: paymentIntentId },
    token,
  });
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

export async function login(request: LoginRequest): Promise<AuthResponse> {
  return fetchApi<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: request,
  });
}

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  return fetchApi<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: request,
  });
}

export async function logout(token: string): Promise<void> {
  await fetchApi('/api/v1/auth/logout', {
    method: 'POST',
    token,
  });
}

export async function getMe(token: string): Promise<{ data: User }> {
  return fetchApi<{ data: User }>('/api/v1/users/me', { token });
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

export async function getAddresses(token: string): Promise<{ data: Address[] }> {
  return fetchApi<{ data: Address[] }>('/api/v1/users/me/addresses', { token });
}

export async function createAddress(
  address: Omit<Address, 'id'>,
  token: string
): Promise<{ data: Address }> {
  return fetchApi<{ data: Address }>('/api/v1/users/me/addresses', {
    method: 'POST',
    body: address,
    token,
  });
}
