import { redirect } from 'next/navigation';
import { isAuthenticated, getServerAddresses } from '@/lib/server-api';
import { ROUTES } from '@/lib/routes';
import { CheckoutPageClient } from '@/components/checkout/CheckoutPageClient';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const addresses = await getServerAddresses();
  if (!addresses || addresses.length === 0) {
    redirect(`${ROUTES.ACCOUNT.NEW_ADDRESS}?redirect=${encodeURIComponent(ROUTES.CHECKOUT.INDEX)}`);
  }

  return <CheckoutPageClient addresses={addresses} />;
}


