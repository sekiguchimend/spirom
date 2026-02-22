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
  country: string; // ISO 3166-1 alpha-2 コード（例: JP, US, CN）
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
  variant_id?: string;
}

export type PaymentMethod = 'credit_card' | 'paypay' | 'rakuten_pay' | 'konbini' | 'bank_transfer';

export interface CreateOrderRequest {
  items?: CreateOrderItemRequest[];
  shipping_address_id: string;
  billing_address_id?: string;
  payment_method: PaymentMethod;
}

// ============================================
// ゲストチェックアウト関連
// ============================================

export interface GuestShippingAddress {
  name: string;
  country: string; // ISO 3166-1 alpha-2 コード（例: JP, US, CN）
  postal_code: string;
  prefecture: string;
  city: string;
  address_line1: string;
  address_line2?: string;
  phone: string;
}

export interface CreateGuestOrderRequest {
  shipping_address: GuestShippingAddress;
  billing_address?: GuestShippingAddress;
  payment_method: PaymentMethod;
  notes?: string;
  email?: string;
  items?: CreateOrderItemRequest[];
}

export interface CreateGuestOrderResponse {
  order: Order;
  guest_access_token: string;
}

export interface CreateGuestPaymentIntentRequest {
  order_id: string;
  guest_token: string;
}

// ============================================
// 商品バリアント（サイズ）関連
// ============================================

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  sku?: string;
  stock: number;
  price_adjustment: number;
  sort_order: number;
  is_active: boolean;
  // サイズ寸法 (cm)
  body_length?: number;    // 身丈
  body_width?: number;     // 身幅
  shoulder_width?: number; // 肩幅
  sleeve_length?: number;  // 袖丈
}

export interface ProductMaterial {
  material: string;        // 素材（例：綿100％）
  material_detail: string; // 素材詳細
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
  variantId?: string;
  size?: string;
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
