import { loadStripe, Stripe } from '@stripe/stripe-js';
import type {
  Order,
  CreateOrderItemRequest,
  CreateOrderRequest,
  CreatePaymentIntentResponse,
  CreateOrderResponse,
} from '@/types';

// Re-export types for backwards compatibility
export type {
  Order,
  CreateOrderItemRequest,
  CreateOrderRequest,
  CreatePaymentIntentResponse,
  CreateOrderResponse,
};

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
