import { redirect } from 'next/navigation';
import { isAuthenticated, getServerAddresses } from '@/lib/server-api';
import { CheckoutContent } from '@/components/checkout/CheckoutContent';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  // Server Componentで認証チェック
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect('/login');
  }

  // Server ComponentからBFFを直接叩いて住所取得（Route Handler経由しない）
  const addresses = await getServerAddresses();

  // 住所がない場合は住所登録ページへ
  if (addresses.length === 0) {
    redirect('/account/addresses/new');
  }

  // Client Componentに住所データを渡す
  return <CheckoutContent addresses={addresses} />;
}
