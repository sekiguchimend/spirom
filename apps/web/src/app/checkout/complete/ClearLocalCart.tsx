'use client';

import { useEffect } from 'react';
import { clearCart } from '@/lib/cart';

/**
 * 決済完了画面に到達したタイミングで、ローカルカートをクリアする。
 * - 既存のカート実装が localStorage なので、ここでのみ副作用を閉じ込める
 * - 注文作成が「モーダル購入」でも、完了後にカートが残って混乱しないようにする
 */
export function ClearLocalCart() {
  useEffect(() => {
    void clearCart().catch(() => {
      // localStorage/ネットワークが使えない環境等でも画面は成立させる
    });
  }, []);

  return null;
}


