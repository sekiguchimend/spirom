import { notFound, redirect } from 'next/navigation';
import { isAuthenticated, getServerAddresses } from '@/lib/server-api';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import { EditAddressForm } from '@/components/address/EditAddressForm';

export const dynamic = 'force-dynamic';

export default async function EditAddressPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale = (lang as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect(routes.AUTH.LOGIN);
  }

  const addresses = await getServerAddresses();
  const address = addresses.find((a) => a.id === id);
  if (!address) {
    notFound();
  }

  return <EditAddressForm address={address} />;
}
