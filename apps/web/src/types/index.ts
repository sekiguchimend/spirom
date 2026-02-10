/**
 * 共通型定義
 * 重複を避けるため、全ての共通型をこのファイルで管理
 */

// ============================================
// ユーザー関連
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role?: string;
  is_active?: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
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
  payment_status?: string;
  subtotal?: number;
  shipping_fee?: number;
  tax?: number;
  total: number;
  currency: string;
  created_at: string;
  shipped_at?: string;
  delivered_at?: string;
  items?: OrderItem[];
  item_count?: number;
}

export interface CreateOrderItemRequest {
  product_id: string;
  quantity: number;
}

export type PaymentMethod = 'credit_card' | 'paypay' | 'rakuten_pay' | 'konbini' | 'bank_transfer';

export interface CreateOrderRequest {
  items?: CreateOrderItemRequest[];
  shipping_address_id: string;
  billing_address_id?: string;
  payment_method: PaymentMethod;
}

// ============================================
// カート関連
// ============================================

export interface CartItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

// ============================================
// 認証関連
// ============================================

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

// ============================================
// API レスポンス共通
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// 決済関連
// ============================================

export interface CreatePaymentIntentResponse {
  data: {
    client_secret: string;
    payment_intent_id: string;
    order_id: string;
  };
}

export interface CreateOrderResponse {
  data: Order;
}
