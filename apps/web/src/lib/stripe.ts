import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('Stripe publishable key is not set');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

// 決済関連の型定義
export interface CreatePaymentIntentResponse {
  data: {
    client_secret: string;
    payment_intent_id: string;
  };
}

export interface CreateOrderItemRequest {
  product_id: string;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
  shipping_address_id: string;
  billing_address_id?: string;
  payment_method: 'credit_card' | 'paypay' | 'rakuten_pay' | 'konbini' | 'bank_transfer';
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
}

export interface CreateOrderResponse {
  data: Order;
}
