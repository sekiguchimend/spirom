'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAddressAction } from '@/lib/actions';

export function DeleteAddressButton({ addressId }: { addressId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    const ok = window.confirm('この住所を削除しますか？');
    if (!ok) return;

    setIsDeleting(true);
    const res = await deleteAddressAction(addressId);
    if (!res.success) {
      setError(res.error || '削除に失敗しました');
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
        {isDeleting ? '削除中...' : '削除'}
      </button>
      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}


