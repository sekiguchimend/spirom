import { notFound, redirect } from 'next/navigation';
import { isAuthenticated, getServerAddresses } from '@/lib/server-api';
import { ROUTES } from '@/lib/routes';
import { EditAddressForm } from '@/components/address/EditAddressForm';

export const dynamic = 'force-dynamic';

export default async function EditAddressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const { id } = await params;
  const addresses = await getServerAddresses();
  const address = addresses.find((a) => a.id === id);
  if (!address) {
    notFound();
  }

  return <EditAddressForm address={address} />;
}


