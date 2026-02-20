import { isAuthenticated, getServerAddresses } from '@/lib/server-api';
import { CheckoutPageClient } from '@/components/checkout/CheckoutPageClient';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const authenticated = await isAuthenticated();

  if (authenticated) {
    // 認証済みユーザー：住所を取得して既存フロー
    const addresses = await getServerAddresses();

    // 住所がない場合は住所追加画面へリダイレクト（既存動作を維持）
    // ただしリダイレクトではなくコンポーネント側で処理
    return <CheckoutPageClient addresses={addresses || []} isGuest={false} />;
  }

  // 未認証ユーザー：ゲストチェックアウトフロー
  return <CheckoutPageClient addresses={[]} isGuest={true} />;
}
