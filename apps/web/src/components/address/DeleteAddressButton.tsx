'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAddressAction } from '@/lib/actions';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Locale } from '@/lib/i18n/config';

interface DeleteAddressButtonProps {
  addressId: string;
  locale?: Locale;
}

export function DeleteAddressButton({ addressId }: DeleteAddressButtonProps) {
  const router = useRouter();
  const { t } = useTranslation('account');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    const ok = window.confirm(t('addresses.deleteConfirm.title'));
    if (!ok) return;

    setIsDeleting(true);
    const res = await deleteAddressAction(addressId);
    if (!res.success) {
      setError(res.error || t('addresses.delete'));
      setIsDeleting(false);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-xs text-red-500 hover:text-red-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isDeleting ? t('addresses.deleteConfirm.deleting') : t('addresses.delete')}
      </button>
      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}


