import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/server-api';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import { AddressForm } from '@/components/address/AddressForm';

export const dynamic = 'force-dynamic';

export default async function NewAddressPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (lang as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect(routes.AUTH.LOGIN);
  }

  return <AddressForm />;
}
