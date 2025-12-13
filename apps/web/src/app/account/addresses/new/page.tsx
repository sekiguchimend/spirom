import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/server-api';
import { AddressForm } from '@/components/address/AddressForm';
import { ROUTES } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export default async function NewAddressPage() {
  // Server Componentで認証チェック
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  return <AddressForm />;
}
