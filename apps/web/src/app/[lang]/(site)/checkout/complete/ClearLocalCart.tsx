'use client';

import { useEffect } from 'react';
import { clearCart } from '@/lib/cart';
import { clearCheckoutOrder } from '@/components/checkout/CheckoutPageClient';

/**
 * 決済完了画面に到達したタイミングで、ローカルカートとチェックアウト注文情報をクリアする。
 * - 既存のカート実装が localStorage なので、ここでのみ副作用を閉じ込める
 * - 注文作成が「モーダル購入」でも、完了後にカートが残って混乱しないようにする
 * - sessionStorageの進行中の注文情報もクリアする（重複注文防止のため）
 */
export function ClearLocalCart() {
  useEffect(() => {
    // チェックアウト注文情報をクリア（重複注文防止）
    clearCheckoutOrder();

    void clearCart().catch(() => {
      // localStorage/ネットワークが使えない環境等でも画面は成立させる
    });
  }, []);

  return null;
}


