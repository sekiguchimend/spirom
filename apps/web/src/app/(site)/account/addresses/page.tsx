import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerAddresses, isAuthenticated } from '@/lib/server-api';
import { ROUTES } from '@/lib/routes';
import { DeleteAddressButton } from '@/components/address/DeleteAddressButton';

export const dynamic = 'force-dynamic';

function formatPostal(postal: string) {
  // 表示用に 1234567 -> 123-4567 へ寄せる（既にハイフン付きならそのまま）
  const normalized = postal.replace(/-/g, '');
  if (normalized.length === 7) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  }
  return postal;
}

export default async function AddressesPage() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const addresses = await getServerAddresses();

  return (
    <div className="min-h-screen bg-bg-light pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="bg-primary/5 rounded-2xl p-6 md:p-8">
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-0.5 w-8 bg-primary" />
              <p className="text-xs tracking-[0.2em] text-primary uppercase font-bold">
                Addresses
              </p>
              <div className="h-0.5 w-8 bg-primary" />
            </div>
            <h1 className="text-center text-xl text-text-dark" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>
              配送先住所
            </h1>
            <p className="text-center text-sm text-gray-600 mt-2">
              住所の登録・編集・削除ができます。
            </p>
          </div>

          <div className="flex justify-center">
            <Link
              href={`${ROUTES.ACCOUNT.NEW_ADDRESS}?redirect=${encodeURIComponent(ROUTES.ACCOUNT.ADDRESSES)}`}
              className="px-6 py-3 text-sm font-bold bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
            >
              新しい住所を追加
            </Link>
          </div>
        </div>

        {/* 一覧 */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
          {addresses.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-600 font-bold mb-4">住所が登録されていません</p>
              <Link
                href={`${ROUTES.ACCOUNT.NEW_ADDRESS}?redirect=${encodeURIComponent(ROUTES.ACCOUNT.ADDRESSES)}`}
                className="inline-block px-6 py-3 text-sm font-bold bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
              >
                住所を登録する
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((a) => (
                <div key={a.id} className="border-2 border-gray-100 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-black text-text-dark truncate">
                          {a.name || '住所'}
                        </p>
                        {a.is_default && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                            デフォルト
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600">
                        〒{formatPostal(a.postal_code)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {a.prefecture}{a.city}{a.address_line1}
                      </p>
                      {a.address_line2 && (
                        <p className="text-sm text-gray-600">{a.address_line2}</p>
                      )}
                      {a.phone && (
                        <p className="text-sm text-gray-600 mt-1">{a.phone}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <Link
                        href={`${ROUTES.ACCOUNT.EDIT_ADDRESS(a.id)}?redirect=${encodeURIComponent(ROUTES.ACCOUNT.ADDRESSES)}`}
                        className="text-xs font-bold text-primary hover:text-primary-dark transition-colors"
                      >
                        編集
                      </Link>
                      <DeleteAddressButton addressId={a.id} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <Link
            href={ROUTES.ACCOUNT.INDEX}
            className="text-sm font-bold text-primary hover:text-primary-dark transition-colors"
          >
            ← マイアカウントへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}


